import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/TaskCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import type { EnrichedTask, Task } from "@/types";

interface PlanTabProps {
    todaysPlan: (Task | EnrichedTask)[];
    planTotalTime: number;
    timeBudget: string;
    planMeta?: {
        totalMin: number;
        energyLoad: { high: number; medium: number; low: number };
    };
    isExporting: boolean;
    planGenerated: boolean;
    enrichingSingleTaskId: string | null;
    completingTaskId: string | null;
    updatingChecklistItemId: string | null;
    onExportPlan: () => void;
    onEnrichSingleTask: (task: Task | EnrichedTask) => void;
    onCompleteTask: (listId: string, taskId: string) => void;
    onUpdateChecklistItem: (listId: string, taskId: string, checklistItemId: string, isChecked: boolean) => void;
    onEditTask: (task: Task | EnrichedTask) => void;
    onUpdateChecklistItemDetails: (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => void;
    onFocusTask: (task: Task | EnrichedTask) => void;
}

export const PlanTab = ({
    todaysPlan,
    planTotalTime,
    timeBudget,
    planMeta,
    isExporting,
    planGenerated,
    enrichingSingleTaskId,
    completingTaskId,
    updatingChecklistItemId,
    onExportPlan,
    onEnrichSingleTask,
    onCompleteTask,
    onUpdateChecklistItem,
    onEditTask,
    onUpdateChecklistItemDetails,
    onFocusTask
}: PlanTabProps) => {
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                {todaysPlan.length > 0 ? (
                    <>
                        <div className="text-sm text-muted-foreground">
                            Total time: <strong>{planMeta?.totalMin || planTotalTime} min</strong> / {timeBudget} min
                            {planMeta && (
                                <div className="flex gap-2 text-xs">
                                    <span>(H: {planMeta.energyLoad.high} M: {planMeta.energyLoad.medium} L: {planMeta.energyLoad.low})</span>
                                </div>
                            )}
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onExportPlan} disabled={isExporting} size="sm">
                                    {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Export to To Do
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span>Move plan to To Do list</span>
                                    <Kbd>Alt + X</Kbd>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </>
                ) : null}
            </div>

            {todaysPlan.length > 0 ? (
                todaysPlan.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onEnrich={onEnrichSingleTask}
                        isEnriching={enrichingSingleTaskId === task.id}
                        onComplete={onCompleteTask}
                        isCompleting={completingTaskId === task.id}
                        onUpdateChecklistItem={onUpdateChecklistItem}
                        updatingChecklistItemId={updatingChecklistItemId}
                        onEdit={onEditTask}
                        onUpdateChecklistItemName={onUpdateChecklistItemDetails}
                        onFocus={onFocusTask}
                    />
                ))
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg animate-scale-in">
                    <h3 className="text-lg font-medium">
                        {planGenerated ? "Nothing to do today." : "Your plan is empty."}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                        {planGenerated
                            ? "Enjoy your free time or generate a new plan!"
                            : "Generate a plan from the sidebar to get started."
                        }
                    </p>
                </div>
            )}
        </>
    );
};
