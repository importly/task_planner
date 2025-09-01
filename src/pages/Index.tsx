import { useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LayoutDashboard, ClipboardCheck, ListTodo, FileWarning, BrainCircuit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Components
import { IndexSidebar } from "@/components/IndexSidebar";
import { MainHeader } from "@/components/MainHeader";
import { TaskFilters } from "@/components/TaskFilters";
import { PlanTab } from "@/components/PlanTab";
import { TaskAccordion } from "@/components/TaskAccordion";
import { TimelineView } from "@/components/TimelineView";
import { EditTaskForm } from "@/components/EditTaskForm";
import { WorkloadWarningBanner } from "@/components/WorkloadWarningBanner";
import { BulkAddView } from "@/components/BulkAddView";

// Hooks
import { useIndexState } from "@/hooks/useIndexState";
import { useIndexHelpers } from "@/hooks/useIndexHelpers";

const Index = () => {
    const state = useIndexState();
    const { groupTasksByList, getDateTimeStrings, getAllContexts, getPlanTotalTime } = useIndexHelpers();
    const createTaskButtonRef = useRef<HTMLButtonElement>(null);

    // Derived values
    const { dateString, timeString } = getDateTimeStrings(state.currentTime);
    const groupedAvailableTasks = useMemo(() => groupTasksByList(state.availableTasks), [state.availableTasks]);
    const groupedNeedsReviewTasks = useMemo(() => groupTasksByList(state.needsReviewTasks), [state.needsReviewTasks]);
    const allContexts = getAllContexts(state.availableTasks, state.todaysPlan);
    const planTotalTime = getPlanTotalTime(state.todaysPlan);

    // Wrapper functions to handle signature mismatches
    const handleUpdateChecklistItemDetails = (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => {
        return state.updateChecklistItemDetails(listId, taskId, checklistItemId, newDisplayName);
    };

    // Loading state
    if (state.isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Loading your session...</p>
            </div>
        );
    }

    // Unauthenticated state
    if (!state.isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
                <div className="w-full max-w-md flex flex-col items-center text-center gap-6 p-10 border rounded-lg bg-card shadow-xl">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Intelligent Planner</h1>
                            <p className="text-sm text-muted-foreground">for Microsoft To Do</p>
                        </div>
                    </div>
                    <Separator />
                    <p className="text-muted-foreground">
                        Welcome! Please log in with your Microsoft account to start planning your tasks.
                    </p>
                    <Button onClick={state.login} size="lg" className="w-full">
                        <LogIn className="mr-2 h-5 w-5" />
                        Login with Microsoft
                    </Button>
                </div>
            </div>
        );
    }

    // Main application
    return (
        <div className="min-h-screen flex flex-col md:flex-row text-foreground overflow-hidden">
            <IndexSidebar
                account={state.account}
                timeBudget={state.timeBudget}
                setTimeBudget={state.setTimeBudget}
                optimizeContextSwitches={state.optimizeContextSwitches}
                setOptimizeContextSwitches={state.setOptimizeContextSwitches}
                needsReviewTasksCount={state.needsReviewTasks.length}
                isEnriching={state.isEnriching}
                isCreateTaskOpen={state.isCreateTaskOpen}
                setCreateTaskOpen={state.setCreateTaskOpen}
                taskLists={state.taskLists}
                onGeneratePlan={state.handleGeneratePlan}
                onEnrichAllTasks={state.enrichAllReviewTasks}
                onLogout={state.logout}
                onCreateTask={state.createTask}
                isGoogleAuthenticated={state.isGoogleAuthenticated}
                loginGoogle={state.loginGoogle}
                createTaskButtonRef={createTaskButtonRef}
            />

            <main className="flex-1 p-6 md:p-8 overflow-y-auto animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                <MainHeader
                    dateString={dateString}
                    timeString={timeString}
                    isRefreshing={state.isRefreshing}
                    onRefresh={state.fetchAndProcessTasks}
                />

                <div className="mb-8">
                    <WorkloadWarningBanner warnings={state.workloadWarnings} onDismiss={state.dismissWarning} />
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Today's Timeline</h3>
                    <TimelineView tasks={state.todaysPlan} calendarEvents={state.calendarEvents} />
                </div>

                <TaskFilters
                    allContexts={allContexts}
                    filter={state.filter}
                    setFilter={state.setFilter}
                    sort={state.sort}
                    setSort={state.setSort}
                />

                <Tabs defaultValue="plan" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto sm:h-10">
                        <TabsTrigger value="plan" className="flex-wrap">
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Today's Plan <Badge variant="secondary" className="ml-2">{state.todaysPlan.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="available">
                            <ListTodo className="mr-2 h-4 w-4" />
                            Available <Badge variant="secondary" className="ml-2">{state.availableTasks.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="triage">
                            <FileWarning className="mr-2 h-4 w-4" />
                            Needs Review <Badge variant="destructive" className="ml-2">{state.needsReviewTasks.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="bulk-add">
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            Bulk Add (AI)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="plan" className="mt-6">
                        <PlanTab
                            todaysPlan={state.todaysPlan}
                            planTotalTime={planTotalTime}
                            timeBudget={state.timeBudget}
                            planMeta={state.planMeta}
                            isExporting={state.isExporting}
                            planGenerated={state.planGenerated}
                            enrichingSingleTaskId={state.enrichingTaskId}
                            completingTaskId={state.completingTaskId}
                            updatingChecklistItemId={state.updatingChecklistItemId}
                            onExportPlan={state.exportPlan}
                            onEnrichSingleTask={state.enrichSingleTask}
                            onCompleteTask={state.completeTask}
                            onUpdateChecklistItem={state.updateChecklistItemStatus}
                            onEditTask={state.setEditingTask}
                            onUpdateChecklistItemDetails={handleUpdateChecklistItemDetails}
                            onFocusTask={state.handleFocus}
                        />
                    </TabsContent>

                    <TabsContent value="available" className="mt-6">
                        <TaskAccordion
                            groupedTasks={groupedAvailableTasks}
                            enrichingSingleTaskId={state.enrichingTaskId}
                            completingTaskId={state.completingTaskId}
                            updatingChecklistItemId={state.updatingChecklistItemId}
                            emptyMessage={{
                                title: "No tasks available.",
                                description: "Try refreshing or adding tasks in Microsoft To Do."
                            }}
                            onEnrichSingleTask={state.enrichSingleTask}
                            onCompleteTask={state.completeTask}
                            onUpdateChecklistItem={state.updateChecklistItemStatus}
                            onEditTask={state.setEditingTask}
                            onUpdateChecklistItemDetails={handleUpdateChecklistItemDetails}
                            onFocusTask={state.handleFocus}
                        />
                    </TabsContent>

                    <TabsContent value="triage" className="mt-6">
                        <TaskAccordion
                            groupedTasks={groupedNeedsReviewTasks}
                            enrichingSingleTaskId={state.enrichingTaskId}
                            completingTaskId={state.completingTaskId}
                            updatingChecklistItemId={state.updatingChecklistItemId}
                            emptyMessage={{
                                title: "Review list is all clear!",
                                description: "All your tasks have the necessary properties for planning."
                            }}
                            onEnrichSingleTask={state.enrichSingleTask}
                            onCompleteTask={state.completeTask}
                            onUpdateChecklistItem={state.updateChecklistItemStatus}
                            onEditTask={state.setEditingTask}
                            onUpdateChecklistItemDetails={handleUpdateChecklistItemDetails}
                            onFocusTask={state.handleFocus}
                        />
                    </TabsContent>

                    <TabsContent value="bulk-add" className="mt-6">
                        <BulkAddView
                            bulkCreateTasks={state.bulkCreateTasksFromPrompt}
                            isProcessing={state.isBulkCreating}
                        />
                    </TabsContent>
                </Tabs>
            </main>

            {/* Edit Task Dialog */}
            {state.editingTask && (
                <Dialog open={true} onOpenChange={(isOpen) => !isOpen && state.setEditingTask(null)}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Edit Task</DialogTitle>
                            <DialogDescription>
                                Make changes to your task details below. This will not affect AI-generated properties.
                            </DialogDescription>
                        </DialogHeader>
                        <EditTaskForm
                            task={state.editingTask}
                            onUpdate={async (payload) => {
                                if (state.editingTask) {
                                    await state.updateTaskDetails(state.editingTask.listId, state.editingTask.id, payload);
                                }
                            }}
                            onSuccess={() => state.setEditingTask(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default Index;