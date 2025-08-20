import {useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {usePlanner} from "@/hooks/usePlanner";
import {TaskCard} from "@/components/TaskCard";
import {Separator} from "@/components/ui/separator";
import {
    BarChart2,
    CalendarCheck,
    ClipboardCheck,
    FileWarning,
    LayoutDashboard,
    ListTodo,
    Loader2,
    LogIn,
    LogOut,
    PlusCircle,
    RefreshCw,
    Wand2
} from "lucide-react";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger,} from "@/components/ui/accordion";
import {EnrichedTask, Task} from "@/types";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {AnalogClock} from "@/components/AnalogClock";
import {TimelineView} from "@/components/TimelineView";
import {SettingsDialog} from "@/components/SettingsDialog";
import {CreateTaskForm} from "@/components/CreateTaskForm";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Kbd} from "@/components/ui/kbd";
import {useHotkeys} from "@/hooks/useHotkeys";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {EditTaskForm} from "@/components/EditTaskForm";
import {WorkloadWarningBanner} from "@/components/WorkloadWarningBanner";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";

const groupTasksByList = (tasks: (Task | EnrichedTask)[]) => {
    return tasks.reduce((acc: { [key: string]: (Task | EnrichedTask)[] }, task) => {
        const listName = (task as any).listName || 'Unknown List';
        if (!acc[listName]) {
            acc[listName] = [];
        }
        acc[listName].push(task);
        return acc;
    }, {});
};

const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

const Index = () => {
    const {
        isAuthenticated,
        account,
        isLoading,
        availableTasks,
        needsReviewTasks,
        todaysPlan,
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
        isGoogleAuthenticated,
        loginGoogle,
        calendarEvents,
        calculatedTimeBudget,
        taskLists,
        createTask,
        completeTask,
        completingTaskId,
        updateChecklistItemStatus,
        updatingChecklistItemId,
        updateTaskDetails,
        updateChecklistItemDetails,
        setFocusTask,
        filter,
        setFilter,
        sort,
        setSort,
        workloadWarnings,
        dismissWarning,
        planMeta,
    } = usePlanner();
    const navigate = useNavigate();
    const [timeBudget, setTimeBudget] = useState("180");
    const [planGenerated, setPlanGenerated] = useState(false);
    const [optimizeContextSwitches, setOptimizeContextSwitches] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | EnrichedTask | null>(null);
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
    const [tries, settries] = useState(0);


    const createTaskButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        if (calculatedTimeBudget !== null) {
            setTimeBudget(calculatedTimeBudget.toString());
        }
    }, [calculatedTimeBudget]);

    useEffect(() => {
        const handleVisibilityChange = () => setIsTabVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


    // This effect now handles the auto-login attempts with a fallback.
    useEffect(() => {
        // We only try to log in if loading is done, user is not authenticated, AND the tab is active.
        if (!isLoading && !isAuthenticated && isTabVisible && tries < 4) {
            login();
            settries(tries + 1);
        } else if (!isLoading && !isAuthenticated && !isTabVisible) {
            // If the tab is not visible, we don't attempt to log in; the UI will show the login button instead.
        }
    }, [isAuthenticated, login, isLoading, isTabVisible, tries]);


    const handleGeneratePlan = () => {
        const budget = parseInt(timeBudget, 10);
        if (!isNaN(budget) && budget > 0) {
            generatePlan(budget);
        }
        setPlanGenerated(true);
    };

    const hotkeys = useMemo(() => [{
        key: 'n',
        altKey: true,
        callback: () => createTaskButtonRef.current?.click()
    }, {key: 'g', altKey: true, callback: handleGeneratePlan}, {
        key: 'e', altKey: true, callback: () => {
            if (!isEnriching && needsReviewTasks.length > 0) enrichAllReviewTasks();
        }
    }, {
        key: 'r', altKey: true, callback: () => {
            if (!isRefreshing) fetchAndProcessTasks();
        }
    }, {
        key: 'x', altKey: true, callback: () => {
            if (!isExporting && todaysPlan.length > 0) exportPlan();
        }
    },], [isEnriching, needsReviewTasks, enrichAllReviewTasks, isRefreshing, fetchAndProcessTasks, isExporting, todaysPlan, exportPlan, handleGeneratePlan]);

    useHotkeys(hotkeys);

    const handleFocus = (task: Task | EnrichedTask) => {
        if ('score' in task) {
            setFocusTask(task);
            navigate("/focus", {state: {task}});
        }
    };

    const planTotalTime = useMemo(() => {
        return todaysPlan.reduce((total, task) => total + ((task as EnrichedTask).estTime || 0), 0);
    }, [todaysPlan]);

    const groupedAvailableTasks = useMemo(() => groupTasksByList(availableTasks), [availableTasks]);
    const groupedNeedsReviewTasks = useMemo(() => groupTasksByList(needsReviewTasks), [needsReviewTasks]);
    const allContexts = useMemo(() => {
        const contexts = new Set<string>();
        [...availableTasks, ...todaysPlan].forEach(task => {
            if ('context' in task) {
                contexts.add((task as EnrichedTask).context);
            }
        });
        return Array.from(contexts);
    }, [availableTasks, todaysPlan]);

    const dayOfWeek = currentTime.toLocaleDateString('en-US', {weekday: 'long'});
    const dayOfMonth = currentTime.getDate();
    const dateString = `${dayOfWeek}, ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
    const timeString = currentTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
                <Loader2 className="h-16 w-16 animate-spin text-primary"/>
                <p className="text-muted-foreground mt-4">Loading your session...</p>
            </div>);
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
                <div
                    className="w-full max-w-md flex flex-col items-center text-center gap-6 p-10 border rounded-lg bg-card shadow-xl">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-10 w-10 text-primary"/>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Intelligent Planner</h1>
                            <p className="text-sm text-muted-foreground">for Microsoft To Do</p>
                        </div>
                    </div>
                    <Separator/>
                    <p className="text-muted-foreground">
                        Welcome! Please log in with your Microsoft account to start planning your tasks.
                    </p>
                    <Button onClick={login} size="lg" className="w-full">
                        <LogIn className="mr-2 h-5 w-5"/>
                        Login with Microsoft
                    </Button>
                </div>
            </div>
        );
    }


    return (<div className="min-h-screen flex flex-col md:flex-row text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside
            className="w-full md:w-80 lg:w-96 grainy-gradient-sidebar bg-card backdrop-blur-sm p-6 flex flex-col gap-8 border-r border-white/10 animate-slide-in-from-left">
            <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-primary"/>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Intelligent Planner</h1>
                    <p className="text-sm text-muted-foreground">for Microsoft To Do</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{account?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{account?.name}</span>
                </div>
                <div className="flex items-center">
                    <SettingsDialog isGoogleAuthenticated={isGoogleAuthenticated} loginGoogle={loginGoogle}/>
                    <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                        <LogOut className="h-5 w-5"/>
                    </Button>
                </div>
            </div>

            <Separator className="bg-white/10"/>

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Quick Actions</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <Dialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <Button ref={createTaskButtonRef} variant="outline" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4"/>
                                        Create New Task
                                    </Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span>Create a new task</span><Kbd>Alt + N</Kbd>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                                <DialogDescription>
                                    Add a new task to one of your Microsoft To Do lists.
                                </DialogDescription>
                            </DialogHeader>
                            <CreateTaskForm
                                taskLists={taskLists}
                                createTask={createTask}
                                onSuccess={() => setCreateTaskOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Generate Today's Plan</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <div>
                        <label htmlFor="time-budget" className="text-sm font-medium text-muted-foreground">Available
                            Time (minutes)</label>
                        <Input
                            id="time-budget"
                            type="number"
                            value={timeBudget}
                            onChange={(e) => setTimeBudget(e.target.value)}
                            placeholder="e.g., 180"
                            className="mt-1"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="optimize-context" checked={optimizeContextSwitches}
                                onCheckedChange={setOptimizeContextSwitches}/>
                        <Label htmlFor="optimize-context">Optimize context switches</Label>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleGeneratePlan} className="w-full">
                                <CalendarCheck className="mr-2 h-4 w-4"/>
                                Generate Plan
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex items-center justify-between w-full gap-4">
                                <span>Generate plan from available tasks</span><Kbd>Alt + G</Kbd>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Review Center</h3>
                <div className="flex flex-col gap-3 p-4 border border-white/10 rounded-lg bg-black/20">
                    <p className="text-sm text-muted-foreground">
                        {needsReviewTasks.length > 0 ? `${needsReviewTasks.length} tasks need properties like time and urgency to be planned.` : "All tasks are ready for planning!"}
                    </p>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={enrichAllReviewTasks}
                                    disabled={isEnriching || needsReviewTasks.length === 0}>
                                {isEnriching ? (<Loader2 className="mr-2 h-4 w-4 animate-spin"/>) : (
                                    <Wand2 className="mr-2 h-4 w-4"/>)}
                                Enrich All with AI
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex items-center justify-between w-full gap-4">
                                <span>Use AI to enrich all pending tasks</span><Kbd>Alt + E</Kbd>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Analytics</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <Button asChild variant="outline" className="w-full">
                        <Link to="/review">
                            <BarChart2 className="mr-2 h-4 w-4"/>
                            View Productivity Review
                        </Link>
                    </Button>
                </div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto animate-fade-in"
              style={{animationDelay: '200ms', animationFillMode: 'backwards'}}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-6">
                    <AnalogClock/>
                    <div>
                        <p className="text-xl font-semibold text-muted-foreground">{dateString}</p>
                        <p className="text-4xl font-bold tracking-tighter">{timeString}</p>
                    </div>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={() => fetchAndProcessTasks()} disabled={isRefreshing}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
                            Refresh
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="flex items-center justify-between w-full gap-4">
                            <span>Refresh tasks from Microsoft To Do</span><Kbd>Alt + R</Kbd>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="mb-8">
                <WorkloadWarningBanner warnings={workloadWarnings} onDismiss={dismissWarning}/>
            </div>
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Today's Timeline</h3>
                <TimelineView tasks={todaysPlan} calendarEvents={calendarEvents}/>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Filter by Context</label>
                        <Select onValueChange={(value) => setFilter({...filter, context: value})}
                                defaultValue={filter.context}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Contexts"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Contexts</SelectItem>
                                {allContexts.map(context => (
                                    <SelectItem key={context} value={context}>{context}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Sort by</label>
                        <Select onValueChange={(value) => setSort({...sort, by: value})} defaultValue={sort.by}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Default"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="score">Score</SelectItem>
                                <SelectItem value="due_date">Due Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="plan" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
                    <TabsTrigger value="plan" className="flex-wrap">
                        <ClipboardCheck className="mr-2 h-4 w-4"/>
                        Today's Plan <Badge variant="secondary" className="ml-2">{todaysPlan.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="available">
                        <ListTodo className="mr-2 h-4 w-4"/>
                        Available <Badge variant="secondary" className="ml-2">{availableTasks.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="triage">
                        <FileWarning className="mr-2 h-4 w-4"/>
                        Needs Review <Badge variant="destructive" className="ml-2">{needsReviewTasks.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                        {todaysPlan.length > 0 ? (<>
                            <div className="text-sm text-muted-foreground">
                                Total
                                time: <strong>{planMeta?.totalMin || planTotalTime} min</strong> / {timeBudget} min
                                {planMeta && (<div className="flex gap-2 text-xs">
                                    <span>(H: {planMeta.energyLoad.high} M: {planMeta.energyLoad.medium} L: {planMeta.energyLoad.low})</span>
                                </div>)}
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={exportPlan} disabled={isExporting} size="sm">
                                        {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Export to To Do
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="flex items-center justify-between w-full gap-4">
                                        <span>Move plan to To Do list</span><Kbd>Alt + X</Kbd>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </>) : null}
                    </div>
                    {todaysPlan.length > 0 ? (todaysPlan.map((task) => <TaskCard key={task.id} task={task}
                                                                                 onEnrich={enrichSingleTask}
                                                                                 isEnriching={enrichingTaskId === task.id}
                                                                                 onComplete={completeTask}
                                                                                 isCompleting={completingTaskId === task.id}
                                                                                 onUpdateChecklistItem={updateChecklistItemStatus}
                                                                                 updatingChecklistItemId={updatingChecklistItemId}
                                                                                 onEdit={setEditingTask}
                                                                                 onUpdateChecklistItemName={updateChecklistItemDetails}
                                                                                 onFocus={handleFocus}/>)) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg animate-scale-in">
                            <h3 className="text-lg font-medium">{planGenerated ? "Nothing to do today." : "Your plan is empty."}
                            </h3>
                            <p className="text-muted-foreground mt-1">{planGenerated ? "Enjoy your free time or generate a new plan!" : "Generate a plan from the sidebar to get started."}</p>
                        </div>)}
                </TabsContent>

                <TabsContent value="available" className="mt-6">
                    {Object.keys(groupedAvailableTasks).length > 0 ? (<Accordion type="multiple" className="w-full"
                                                                                 defaultValue={Object.keys(groupedAvailableTasks)}>
                        {Object.entries(groupedAvailableTasks).map(([listName, tasks]) => (
                            <AccordionItem value={listName} key={listName}>
                                <AccordionTrigger>{listName} ({tasks.length})</AccordionTrigger>
                                <AccordionContent className="px-4 pt-2">
                                    {tasks.map((task) => (
                                        <TaskCard key={task.id} task={task} onEnrich={enrichSingleTask}
                                                  isEnriching={enrichingTaskId === task.id}
                                                  onComplete={completeTask}
                                                  isCompleting={completingTaskId === task.id}
                                                  onUpdateChecklistItem={updateChecklistItemStatus}
                                                  updatingChecklistItemId={updatingChecklistItemId}
                                                  onEdit={setEditingTask}
                                                  onUpdateChecklistItemName={updateChecklistItemDetails}
                                                  onFocus={handleFocus}/>))}
                                </AccordionContent>
                            </AccordionItem>))}
                    </Accordion>) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg animate-scale-in">
                            <h3 className="text-lg font-medium">No tasks available.</h3>
                            <p className="text-muted-foreground mt-1">Try refreshing or adding tasks in Microsoft To
                                Do.</p>
                        </div>)}
                </TabsContent>

                <TabsContent value="triage" className="mt-6">
                    {Object.keys(groupedNeedsReviewTasks).length > 0 ? (
                        <Accordion type="multiple" className="w-full"
                                   defaultValue={Object.keys(groupedNeedsReviewTasks)}>
                            {Object.entries(groupedNeedsReviewTasks).map(([listName, tasks]) => (
                                <AccordionItem value={listName} key={listName}>
                                    <AccordionTrigger>{listName} ({tasks.length})</AccordionTrigger>
                                    <AccordionContent className="px-4 pt-2">
                                        {tasks.map((task) => <TaskCard key={task.id} task={task}
                                                                       onEnrich={enrichSingleTask}
                                                                       isEnriching={enrichingTaskId === task.id}
                                                                       onComplete={completeTask}
                                                                       isCompleting={completingTaskId === task.id}
                                                                       onUpdateChecklistItem={updateChecklistItemStatus}
                                                                       updatingChecklistItemId={updatingChecklistItemId}
                                                                       onEdit={setEditingTask}
                                                                       onUpdateChecklistItemName={updateChecklistItemDetails}
                                                                       onFocus={handleFocus}/>)}
                                    </AccordionContent>
                                </AccordionItem>))}
                        </Accordion>) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg animate-scale-in">
                            <h3 className="text-lg font-medium">Review list is all clear!</h3>
                            <p className="text-muted-foreground mt-1">All your tasks have the necessary properties
                                for planning.</p>
                        </div>)}
                </TabsContent>
            </Tabs>
        </main>

        {editingTask && (<Dialog open={true} onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                        Make changes to your task details below. This will not affect AI-generated properties.
                    </DialogDescription>
                </DialogHeader>
                <EditTaskForm
                    task={editingTask}
                    onUpdate={async (payload) => {
                        if (editingTask) {
                            await updateTaskDetails(editingTask.listId, editingTask.id, payload);
                        }
                    }}
                    onSuccess={() => setEditingTask(null)}
                />
            </DialogContent>
        </Dialog>)}
    </div>);
};

export default Index;