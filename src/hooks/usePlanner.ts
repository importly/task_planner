import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useMsal} from "@azure/msal-react";
import {useGoogleLogin} from "@react-oauth/google";
import {InteractionStatus} from "@azure/msal-browser";
import {CalendarEvent, EnrichedTask, PlannedDayMeta, Task} from "@/types";
import {toast} from "sonner";
import {loginRequest} from "@/lib/msalConfig";
import * as graphApi from "@/services/microsoftGraphApiService";
import * as geminiApi from "@/services/geminiApiService";
import * as googleApi from "@/services/googleCalendarApiService";
import {mapImportance, processTasks} from "@/lib/taskProcessor";
import * as planOptimizer from "@/lib/planOptimizer";
import {supabase} from "@/lib/supabaseClient";

export const usePlanner = () => {
    const {instance, accounts, inProgress} = useMsal();

    const [allEnrichedTasks, setAllEnrichedTasks] = useState<EnrichedTask[]>([]);
    const [needsReviewTasks, setneedsReviewTasks] = useState<Task[]>([]);
    const [todaysPlan, setTodaysPlan] = useState<(EnrichedTask | Task)[]>([]);
    const [availableTasks, setAvailableTasks] = useState<EnrichedTask[]>([]);
    const [taskLists, setTaskLists] = useState<any[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isEnriching, setIsEnriching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [enrichingTaskId, setEnrichingTaskId] = useState<string | null>(null);
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
    const [updatingChecklistItemId, setUpdatingChecklistItemId] = useState<string | null>(null);
    const [workloadWarnings, setWorkloadWarnings] = useState<string[]>([]);
    const [planMeta, setPlanMeta] = useState<PlannedDayMeta | null>(null);

    const [focusTask, setFocusTask] = useState<EnrichedTask | null>(null);
    const [filter, setFilter] = useState({context: 'all'});
    const [sort, setSort] = useState({by: 'score', direction: 'desc'});

    // Google Calendar State
    const [googleToken, setGoogleToken] = useState<string | null>(() => localStorage.getItem("googleToken"));
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [calculatedTimeBudget, setCalculatedTimeBudget] = useState<number | null>(null);

    const account = accounts[0];
    const isAuthenticated = !!account;
    const isGoogleAuthenticated = !!googleToken;

    // --- Toast Management ---
    const loadingToastId = useRef<string | number | null>(null);

    const showLoadingToast = (message: string) => {
        if (loadingToastId.current) {
            toast.loading(message, {id: loadingToastId.current});
        } else {
            loadingToastId.current = toast.loading(message);
        }
    };

    const dismissLoadingToast = () => {
        if (loadingToastId.current) {
            toast.dismiss(loadingToastId.current);
            loadingToastId.current = null;
        }
    };

    const showSuccessToast = (message: string) => {
        if (loadingToastId.current) {
            toast.success(message, {id: loadingToastId.current});
            loadingToastId.current = null;
        } else {
            toast.success(message);
        }
    };

    const showErrorToast = (message: string) => {
        if (loadingToastId.current) {
            toast.error(message, {id: loadingToastId.current});
            loadingToastId.current = null;
        } else {
            toast.error(message);
        }
    };
    // --- End Toast Management ---

    const sortedAndFilteredTasks = useMemo(() => {
        const filterAndSort = (tasks: (Task | EnrichedTask)[]) => {
            let processedTasks = [...tasks];

            // Filtering
            if (filter.context !== 'all') {
                processedTasks = processedTasks.filter(task => (task as EnrichedTask).context === filter.context);
            }

            // Sorting
            processedTasks.sort((a, b) => {
                const taskA = a as EnrichedTask;
                const taskB = b as EnrichedTask;

                if (sort.by === 'score') {
                    return sort.direction === 'desc' ? (taskB.score ?? 0) - (taskA.score ?? 0) : (taskA.score ?? 0) - (taskB.score ?? 0);
                }
                if (sort.by === 'due_date') {
                    const dateA = taskA.dueDateTime?.dateTime ? new Date(taskA.dueDateTime.dateTime).getTime() : 0;
                    const dateB = taskB.dueDateTime?.dateTime ? new Date(taskB.dueDateTime.dateTime).getTime() : 0;
                    return sort.direction === 'desc' ? dateB - dateA : dateA - dateB;
                }
                return 0;
            });

            return processedTasks;
        };

        return {
            todaysPlan: filterAndSort(todaysPlan),
            availableTasks: filterAndSort(availableTasks),
            needsReviewTasks: filterAndSort(needsReviewTasks),
        };
    }, [todaysPlan, availableTasks, needsReviewTasks, filter, sort]);

    const acquireToken = useCallback(async () => {
        if (!account) throw new Error("User account not found.");
        const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account,
        });
        return tokenResponse.accessToken;
    }, [instance, account]);

    const fetchAndProcessTasks = useCallback(async (isChainedCall = false) => {
        if (!account) return;
        setIsRefreshing(true);
        if (!isChainedCall) {
            showLoadingToast("Fetching tasks from Microsoft To Do...");
        } else {
            showLoadingToast("Refreshing tasks...");
        }

        try {
            const accessToken = await acquireToken();
            const fetchedTaskLists = await graphApi.getTaskLists(accessToken);
            setTaskLists(fetchedTaskLists);

            const planList = fetchedTaskLists.find((list: any) => list.displayName === "Today's Plan");

            const allRawTasks: (Task & { listId: string; listName: string })[] = [];
            for (const list of fetchedTaskLists) {
                const tasks = await graphApi.getTasksForList(accessToken, list.id);
                const tasksWithListInfo = tasks.map((task: any) => ({
                    ...task,
                    listId: list.id,
                    listName: list.displayName,
                }));
                allRawTasks.push(...tasksWithListInfo);
            }

            const {enrichedTasks: allEnriched, reviewTasks: allPending} = processTasks(allRawTasks);

            const planTasks: (EnrichedTask | Task)[] = [];
            const availableForPlanning: EnrichedTask[] = [];
            const needsReview: Task[] = [];

            if (planList) {
                allEnriched.forEach(task => {
                    if (task.listId === planList.id) {
                        planTasks.push(task);
                    } else {
                        availableForPlanning.push(task);
                    }
                });
                allPending.forEach(task => {
                    if (task.listId === planList.id) {
                        planTasks.push(task);
                    } else {
                        needsReview.push(task);
                    }
                });
            } else {
                availableForPlanning.push(...allEnriched);
                needsReview.push(...allPending);
            }

            setTodaysPlan(planTasks.sort((a, b) => ((b as EnrichedTask).score ?? 0) - ((a as EnrichedTask).score ?? 0)));
            setAllEnrichedTasks(allEnriched);
            setAvailableTasks(availableForPlanning);
            setneedsReviewTasks(needsReview);

            if (!isChainedCall) {
                showSuccessToast("Tasks loaded successfully!");
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not fetch tasks.";
            if (!isChainedCall) {
                showErrorToast(errorMessage);
            }
            if (error instanceof Error && error.name === "InteractionRequiredAuthError") {
                instance.acquireTokenPopup(loginRequest);
            }
            if (isChainedCall) {
                throw error;
            }
        } finally {
            setIsRefreshing(false);
            if (!isChainedCall) {
                dismissLoadingToast();
            }
        }
    }, [account, instance, acquireToken]);

    useEffect(() => {
        if (inProgress === InteractionStatus.None && account) {
            fetchAndProcessTasks();
        }
    }, [inProgress, account, fetchAndProcessTasks]);

    const login = async () => {
        try {
            await instance.loginPopup(loginRequest);
        } catch (e) {
            console.error(e);
            showErrorToast("Login failed. Please try again.");
        }
    };

    const clearGoogleAuth = useCallback(() => {
        setGoogleToken(null);
        localStorage.removeItem("googleToken");
        setCalendarEvents([]);
        setCalculatedTimeBudget(null);
    }, []);

    const logout = async () => {
        await instance.logoutPopup({
            postLogoutRedirectUri: "/",
            mainWindowRedirectUri: "/",
        });
        clearGoogleAuth();
    };

    const loginGoogle = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            const token = tokenResponse.access_token;
            localStorage.setItem("googleToken", token);
            setGoogleToken(token);
            toast.success("Successfully connected to Google Calendar!");
        },
        onError: () => {
            toast.error("Google login failed. Please check your popup blocker and try again.");
        },
        scope: "https://www.googleapis.com/auth/calendar.readonly",
    });

    const fetchCalendarEvents = useCallback(async () => {
        if (!googleToken) return;
        showLoadingToast("Fetching Google Calendar events...");
        try {
            const events = await googleApi.getTodaysEvents(googleToken);
            setCalendarEvents(events);

            // Get the current time and the time for midnight tonight
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0); // Sets to midnight at the end of the current day

            // Calculate the total minutes remaining from now until midnight
            const totalMinutesLeft = (midnight.getTime() - now.getTime()) / (1000 * 60);

            let upcomingEventsDuration = 0;
            events.forEach((event) => {
                if (event.start.dateTime && event.end.dateTime) {
                    const eventStart = new Date(event.start.dateTime);
                    const eventEnd = new Date(event.end.dateTime);
                    const overlapStart = new Date(Math.max(now.getTime(), eventStart.getTime()));
                    const overlapEnd = new Date(Math.min(midnight.getTime(), eventEnd.getTime()));
                    if (overlapEnd > overlapStart) {
                        const duration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
                        upcomingEventsDuration += duration;
                    }
                }
            });

            const availableTime = Math.round(totalMinutesLeft - upcomingEventsDuration);

            setCalculatedTimeBudget(availableTime);
            showSuccessToast(`Calendar events loaded. You have ~${availableTime} minutes free.`);
        } catch (error) {
            showErrorToast("Could not fetch calendar events. Your session may have expired. Please reconnect.");
            console.error(error);
            clearGoogleAuth();
        }
    }, [googleToken, clearGoogleAuth]);

    useEffect(() => {
        if (isGoogleAuthenticated) {
            fetchCalendarEvents();
        }
    }, [isGoogleAuthenticated, fetchCalendarEvents]);

    const generatePlan = useCallback(
        (timeBudget: number) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Phase 1: Candidate Selection
            const candidates = allEnrichedTasks.filter(task => {
                if (task.startDate && task.startDate !== 'None') {
                    const [year, month, day] = task.startDate.split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    return startDate <= today;
                }
                return true;
            });

            // Phase 2 & 3: Optimization and Validation
            const {plan, meta} = planOptimizer.generateOptimizedPlan(candidates, timeBudget);

            setTodaysPlan(plan);
            setWorkloadWarnings(meta.warnings);
            setPlanMeta(meta);

            const planIds = new Set(plan.map(p => p.id));
            setAvailableTasks(allEnrichedTasks.filter(t => !planIds.has(t.id)));
        },
        [allEnrichedTasks],
    );

    const exportPlan = useCallback(async () => {
        if (todaysPlan.length === 0) {
            toast.error("There is no plan to export.");
            return;
        }
        if (!account) {
            toast.error("You must be logged in to export a plan.");
            return;
        }

        setIsExporting(true);
        showLoadingToast(`Moving ${todaysPlan.length} tasks to "Today's Plan"...`);

        try {
            const accessToken = await acquireToken();
            let planList = taskLists.find(list => list.displayName === "Today's Plan");

            if (!planList) {
                showLoadingToast("List 'Today's Plan' not found. Creating it...");
                planList = await graphApi.createTaskList(accessToken, "Today's Plan");
                setTaskLists(prev => [...prev, planList]);
                showLoadingToast(`Moving ${todaysPlan.length} tasks...`);
            }

            const successfulExports: string[] = [];
            const failedExports: { task: (Task | EnrichedTask), error: any }[] = [];

            for (const task of todaysPlan) {
                try {
                    const newTaskPayload = {
                        title: task.title,
                        body: task.body,
                        dueDateTime: task.dueDateTime,
                        importance: mapImportance((task as EnrichedTask).importance),
                    };
                    await graphApi.createTaskInList(accessToken, planList.id, newTaskPayload);
                    await graphApi.deleteTask(accessToken, (task as any).listId, task.id);
                    successfulExports.push(task.title);
                } catch (error) {
                    failedExports.push({task, error});
                }
            }

            if (failedExports.length > 0) {
                toast.error(`${failedExports.length} tasks failed to move. See console for details.`);
                failedExports.forEach(failure => console.error(failure.error));
            }

            if (successfulExports.length > 0) {
                showSuccessToast(`Successfully moved ${successfulExports.length} tasks to "Today's Plan"!`);
                const planTaskIds = new Set(todaysPlan.map(t => t.id));
                setAllEnrichedTasks(prev => prev.filter(t => !planTaskIds.has(t.id)));
                setAvailableTasks(prev => prev.filter(t => !planTaskIds.has(t.id)));
            } else if (failedExports.length > 0) {
                dismissLoadingToast();
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not move plan tasks.";
            showErrorToast(errorMessage);
        } finally {
            setIsExporting(false);
        }
    }, [todaysPlan, account, acquireToken, taskLists]);

    const enrichTask = useCallback(async (taskToEnrich: Task | EnrichedTask) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API key is not configured.");
        }

        const accessToken = await acquireToken();
        const estimates = await geminiApi.getAIEstimates(apiKey, taskToEnrich);

        const properties: any = {
            EstTime: estimates.EstTime,
            Urgency: estimates.Urgency,
            Importance: estimates.Importance,
            Energy: estimates.Energy,
            Context: estimates.Context,
            StartDate: estimates.StartDate || 'None',
        };

        const originalDescription = taskToEnrich.body.content.split('---').pop()?.trim() || '';
        const propertiesString = Object.entries(properties).map(([key, value]) => `${key}: ${value}`).join('\n');
        const newBodyContent = `---
${propertiesString}
---
${originalDescription}`;

        await graphApi.updateTask(accessToken, (taskToEnrich as any).listId, taskToEnrich.id, {
            body: {content: newBodyContent, contentType: 'text'}
        });

        if (estimates.subtasks && estimates.subtasks.length > 0) {
            if (taskToEnrich.checklistItems && taskToEnrich.checklistItems.length > 0) {
                for (const item of taskToEnrich.checklistItems) {
                    await graphApi.deleteChecklistItem(accessToken, (taskToEnrich as any).listId, taskToEnrich.id, item.id);
                }
            }
            for (const subtask of estimates.subtasks) {
                const displayName = `${subtask.title} (${subtask.estTime} min)`;
                await graphApi.createChecklistItem(accessToken, (taskToEnrich as any).listId, taskToEnrich.id, {displayName});
            }
        }
    }, [acquireToken]);

    const enrichSingleTask = async (taskToEnrich: Task | EnrichedTask) => {
        setEnrichingTaskId(taskToEnrich.id);
        showLoadingToast(`Enriching "${taskToEnrich.title}"...`);
        try {
            await enrichTask(taskToEnrich);
            await fetchAndProcessTasks(true);
            showSuccessToast(`Task "${taskToEnrich.title}" was enriched!`);
        } catch (error) {
            console.error(`Failed to enrich task: ${taskToEnrich.title}`, error);
            const errorMessage = error instanceof Error ? error.message : `Could not enrich task: ${taskToEnrich.title}`;
            showErrorToast(errorMessage);
        } finally {
            setEnrichingTaskId(null);
        }
    };

    const enrichAllReviewTasks = async () => {
        if (needsReviewTasks.length === 0) {
            toast.success("No tasks to enrich!");
            return;
        }

        setIsEnriching(true);
        showLoadingToast(`Enriching ${needsReviewTasks.length} tasks with AI...`);
        let successfulCount = 0;

        try {
            for (const task of needsReviewTasks) {
                try {
                    await enrichTask(task);
                    successfulCount++;
                } catch (error) {
                    console.error(`Failed to enrich task: ${task.title}`, error);
                }
            }

            if (successfulCount > 0) {
                await fetchAndProcessTasks(true);
                showSuccessToast(`${successfulCount} of ${needsReviewTasks.length} tasks were enriched!`);
            } else {
                showErrorToast("No tasks could be enriched.");
            }
        } catch (e) {
            showErrorToast("Failed to refresh tasks after enriching.");
        } finally {
            setIsEnriching(false);
        }
    };

    const completeTask = useCallback(async (listId: string, taskId: string) => {
        setCompletingTaskId(taskId);
        showLoadingToast("Completing task...");
        try {
            const accessToken = await acquireToken();
            const taskToComplete = [...allEnrichedTasks, ...needsReviewTasks].find(t => t.id === taskId);

            await graphApi.updateTask(accessToken, listId, taskId, {status: 'completed'});

            if (taskToComplete && account && supabase) {
                const isEnriched = 'score' in taskToComplete;
                const enriched = taskToComplete as EnrichedTask;

// CREATE TABLE public.completed_tasks (
//   id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
//   task_id text NOT NULL,
//   user_id text NOT NULL,
//   completed_at timestamp with time zone NOT NULL DEFAULT now(),
//   title text NOT NULL,
//   est_time integer,
//   urgency integer,
//   importance integer,
//   context text,
//   list_name text,
//   energy text DEFAULT '"medium"'::text,
//   CONSTRAINT completed_tasks_pkey PRIMARY KEY (id)

                const completedTaskData = {
                    task_id: enriched.id,
                    user_id: account.localAccountId,
                    title: enriched.title,
                    est_time: isEnriched ? enriched.estTime : null,
                    urgency: isEnriched ? enriched.urgency : null,
                    importance: isEnriched ? enriched.importance : null,
                    context: isEnriched ? enriched.context : null,
                    list_name: enriched.listName,
                    energy: isEnriched ? enriched.energy : null,
                };

                const {error} = await supabase.from('completed_tasks').insert([completedTaskData]);
                if (error) {
                    console.error("Error saving completed task to Supabase:", error);
                    toast.error("Task completed, but failed to save for analytics.");
                }
            }

            const filterOutCompleted = (tasks: (Task | EnrichedTask)[]) => tasks.filter(t => t.id !== taskId);
            setTodaysPlan(filterOutCompleted);
            setAvailableTasks(tasks => filterOutCompleted(tasks) as EnrichedTask[]);
            setneedsReviewTasks(filterOutCompleted);
            setAllEnrichedTasks(tasks => filterOutCompleted(tasks) as EnrichedTask[]);

            showSuccessToast("Task completed!");
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not complete task.";
            showErrorToast(errorMessage);
        } finally {
            setCompletingTaskId(null);
        }
    }, [acquireToken, account, allEnrichedTasks, needsReviewTasks]);

    const createTask = useCallback(async (listId: string, title: string, body: string) => {
        showLoadingToast("Creating new task...");
        try {
            const accessToken = await acquireToken();
            const taskPayload = {
                title,
                body: {
                    content: body,
                    contentType: 'text'
                }
            };
            await graphApi.createTaskInList(accessToken, listId, taskPayload);
            await fetchAndProcessTasks(true);
            showSuccessToast(`Task "${title}" created successfully!`);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not create task.";
            showErrorToast(errorMessage);
        }
    }, [acquireToken, fetchAndProcessTasks]);

    const updateChecklistItemStatus = useCallback(async (listId: string, taskId: string, checklistItemId: string, isChecked: boolean) => {
        setUpdatingChecklistItemId(checklistItemId);
        try {
            const accessToken = await acquireToken();
            await graphApi.updateChecklistItem(accessToken, listId, taskId, checklistItemId, {isChecked});

            const updateTaskInState = (task: Task | EnrichedTask) => {
                if (task.id === taskId && task.checklistItems) {
                    return {
                        ...task,
                        checklistItems: task.checklistItems.map(item =>
                            item.id === checklistItemId ? {...item, isChecked} : item
                        )
                    };
                }
                return task;
            };

            setTodaysPlan(prev => prev.map(updateTaskInState));
            setAvailableTasks(prev => prev.map(updateTaskInState) as EnrichedTask[]);
            setAllEnrichedTasks(prev => prev.map(updateTaskInState) as EnrichedTask[]);
            setneedsReviewTasks(prev => prev.map(updateTaskInState));

        } catch (error) {
            console.error(error);
            toast.error("Could not update subtask status.");
        } finally {
            setUpdatingChecklistItemId(null);
        }
    }, [acquireToken]);

    const updateTaskDetails = useCallback(async (listId: string, taskId: string, payload: {
        title?: string;
        body?: { content: string };
        dueDateTime?: { dateTime: string; timeZone: string } | null
    }) => {
        showLoadingToast("Updating task...");
        try {
            const accessToken = await acquireToken();
            await graphApi.updateTask(accessToken, listId, taskId, {
                ...payload,
                ...(payload.body && {body: {...payload.body, contentType: 'text'}})
            });
            await fetchAndProcessTasks(true);
            showSuccessToast("Task updated successfully!");
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not update task.";
            showErrorToast(errorMessage);
        }
    }, [acquireToken, fetchAndProcessTasks]);

    const updateChecklistItemDetails = useCallback(async (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => {
        try {
            const accessToken = await acquireToken();
            // Optimistic UI update
            const updateTaskInState = (task: Task | EnrichedTask) => {
                if (task.id === taskId && task.checklistItems) {
                    return {
                        ...task,
                        checklistItems: task.checklistItems.map(item =>
                            item.id === checklistItemId ? {...item, displayName: newDisplayName} : item
                        )
                    };
                }
                return task;
            };

            setTodaysPlan(prev => prev.map(updateTaskInState));
            setAvailableTasks(prev => prev.map(updateTaskInState) as EnrichedTask[]);
            setAllEnrichedTasks(prev => prev.map(updateTaskInState) as EnrichedTask[]);
            setneedsReviewTasks(prev => prev.map(updateTaskInState));

            await graphApi.updateChecklistItem(accessToken, listId, taskId, checklistItemId, {displayName: newDisplayName});
        } catch (error) {
            console.error(error);
            toast.error("Could not update subtask. Please refresh.");
        }
    }, [acquireToken]);

    const dismissWarning = (warningToDismiss: string) => {
        setWorkloadWarnings(warnings => warnings.filter(w => w !== warningToDismiss));
    };

    return {
        isAuthenticated,
        account,
        isLoading: inProgress !== InteractionStatus.None,
        availableTasks: sortedAndFilteredTasks.availableTasks,
        needsReviewTasks: sortedAndFilteredTasks.needsReviewTasks,
        todaysPlan: sortedAndFilteredTasks.todaysPlan,
        login,
        logout,
        generatePlan,
        isExporting,
        exportPlan,
        isEnriching,
        enrichAllReviewTasks,
        isRefreshing,
        fetchAndProcessTasks,
        enrichSingleTask,
        enrichingTaskId,
        taskLists,
        createTask,
        completeTask,
        completingTaskId,
        updateChecklistItemStatus,
        updatingChecklistItemId,
        updateTaskDetails,
        updateChecklistItemDetails,
        focusTask,
        setFocusTask,
        // Google Calendar related
        isGoogleAuthenticated,
        loginGoogle,
        calendarEvents,
        calculatedTimeBudget,
        // Filtering and Sorting
        filter,
        setFilter,
        sort,
        setSort,
        // New planning features
        workloadWarnings,
        dismissWarning,
        planMeta,
    };
};