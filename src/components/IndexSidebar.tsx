import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    BarChart2,
    CalendarCheck,
    LayoutDashboard,
    Loader2,
    LogOut,
    PlusCircle,
    Wand2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Task, EnrichedTask } from "@/types";

interface TaskList {
    id: string;
    displayName: string;
}

interface IndexSidebarProps {
    account: any;
    timeBudget: string;
    setTimeBudget: (value: string) => void;
    optimizeContextSwitches: boolean;
    setOptimizeContextSwitches: (value: boolean) => void;
    needsReviewTasksCount: number;
    isEnriching: boolean;
    isCreateTaskOpen: boolean;
    setCreateTaskOpen: (value: boolean) => void;
    taskLists: TaskList[];
    onGeneratePlan: () => void;
    onEnrichAllTasks: () => void;
    onLogout: () => void;
    onCreateTask: (listId: string, title: string, body?: string) => Promise<void>;
    isGoogleAuthenticated: boolean;
    loginGoogle: () => void;
    createTaskButtonRef: React.RefObject<HTMLButtonElement>;
}

export const IndexSidebar = ({
    account,
    timeBudget,
    setTimeBudget,
    optimizeContextSwitches,
    setOptimizeContextSwitches,
    needsReviewTasksCount,
    isEnriching,
    isCreateTaskOpen,
    setCreateTaskOpen,
    taskLists,
    onGeneratePlan,
    onEnrichAllTasks,
    onLogout,
    onCreateTask,
    isGoogleAuthenticated,
    loginGoogle,
    createTaskButtonRef
}: IndexSidebarProps) => {
    return (
        <aside className="w-full md:w-80 lg:w-96 grainy-gradient-sidebar bg-card backdrop-blur-sm p-6 flex flex-col gap-8 border-r border-white/10 animate-slide-in-from-left">
            {/* Header */}
            <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Intelligent Planner</h1>
                    <p className="text-sm text-muted-foreground">for Microsoft To Do</p>
                </div>
            </div>

            {/* User Section */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{account?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{account?.name}</span>
                </div>
                <div className="flex items-center">
                    <SettingsDialog isGoogleAuthenticated={isGoogleAuthenticated} loginGoogle={loginGoogle} />
                    <Button variant="ghost" size="icon" onClick={onLogout} title="Logout">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Quick Actions</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <Dialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <Button ref={createTaskButtonRef} variant="outline" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create New Task
                                    </Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span>Create a new task</span>
                                    <Kbd>Alt + N</Kbd>
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
                                createTask={onCreateTask}
                                onSuccess={() => setCreateTaskOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Plan Generation */}
            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Generate Today's Plan</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <div>
                        <label htmlFor="time-budget" className="text-sm font-medium text-muted-foreground">
                            Available Time (minutes)
                        </label>
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
                        <Switch
                            id="optimize-context"
                            checked={optimizeContextSwitches}
                            onCheckedChange={setOptimizeContextSwitches}
                        />
                        <Label htmlFor="optimize-context">Optimize context switches</Label>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onGeneratePlan} className="w-full">
                                <CalendarCheck className="mr-2 h-4 w-4" />
                                Generate Plan
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex items-center justify-between w-full gap-4">
                                <span>Generate plan from available tasks</span>
                                <Kbd>Alt + G</Kbd>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Review Center */}
            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Review Center</h3>
                <div className="flex flex-col gap-3 p-4 border border-white/10 rounded-lg bg-black/20">
                    <p className="text-sm text-muted-foreground">
                        {needsReviewTasksCount > 0
                            ? `${needsReviewTasksCount} tasks need properties like time and urgency to be planned.`
                            : "All tasks are ready for planning!"
                        }
                    </p>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={onEnrichAllTasks}
                                disabled={isEnriching || needsReviewTasksCount === 0}
                            >
                                {isEnriching ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Wand2 className="mr-2 h-4 w-4" />
                                )}
                                Enrich All with AI
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex items-center justify-between w-full gap-4">
                                <span>Use AI to enrich all pending tasks</span>
                                <Kbd>Alt + E</Kbd>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Analytics */}
            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-lg">Analytics</h3>
                <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-black/20">
                    <Button asChild variant="outline" className="w-full">
                        <Link to="/review">
                            <BarChart2 className="mr-2 h-4 w-4" />
                            View Productivity Review
                        </Link>
                    </Button>
                </div>
            </div>
        </aside>
    );
};
