import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TaskCard } from "@/components/TaskCard";
import type { EnrichedTask, Task } from "@/types";

interface TaskAccordionProps {
    groupedTasks: { [key: string]: (Task | EnrichedTask)[] };
    enrichingSingleTaskId: string | null;
    completingTaskId: string | null;
    updatingChecklistItemId: string | null;
    emptyMessage: {
        title: string;
        description: string;
    };
    onEnrichSingleTask: (task: Task | EnrichedTask) => void;
    onCompleteTask: (listId: string, taskId: string) => void;
    onUpdateChecklistItem: (listId: string, taskId: string, checklistItemId: string, isChecked: boolean) => void;
    onEditTask: (task: Task | EnrichedTask) => void;
    onUpdateChecklistItemDetails: (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => void;
    onFocusTask: (task: Task | EnrichedTask) => void;
}

export const TaskAccordion = ({
    groupedTasks,
    enrichingSingleTaskId,
    completingTaskId,
    updatingChecklistItemId,
    emptyMessage,
    onEnrichSingleTask,
    onCompleteTask,
    onUpdateChecklistItem,
    onEditTask,
    onUpdateChecklistItemDetails,
    onFocusTask
}: TaskAccordionProps) => {
    if (Object.keys(groupedTasks).length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg animate-scale-in">
                <h3 className="text-lg font-medium">{emptyMessage.title}</h3>
                <p className="text-muted-foreground mt-1">{emptyMessage.description}</p>
            </div>
        );
    }

    return (
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedTasks)}>
            {Object.entries(groupedTasks).map(([listName, tasks]) => (
                <AccordionItem value={listName} key={listName}>
                    <AccordionTrigger>{listName} ({tasks.length})</AccordionTrigger>
                    <AccordionContent className="px-4 pt-2">
                        {tasks.map((task) => (
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
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};
