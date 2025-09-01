import {Card, CardContent, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {EnrichedTask, Task} from "@/types";
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Focus,
  List,
  Loader2,
  Pencil,
  Sparkles,
  Star,
  Tag,
  Zap
} from "lucide-react";
import {format, endOfDay, isPast} from 'date-fns';
import {ChecklistItem} from "./ChecklistItem";
import {Progress} from "@/components/ui/progress";
import {CONTEXT_COLORS, ENERGY_COLORS} from "@/lib/constants";
import {parseGraphApiDate, formatDueDateDistance} from "@/lib/utils";

const isEnriched = (task: Task | EnrichedTask): task is EnrichedTask => {
    return (task as EnrichedTask).score !== undefined;
};

export const TaskCard = ({
                             task,
                             onEnrich,
                             isEnriching,
                             onComplete,
                             isCompleting,
                             onUpdateChecklistItem,
                             updatingChecklistItemId,
                             onEdit,
                             onUpdateChecklistItemName,
                             onFocus,
                         }: {
    task: Task | EnrichedTask;
    onEnrich?: (task: Task | EnrichedTask) => void;
    isEnriching?: boolean;
    onComplete?: (listId: string, taskId: string) => void;
    isCompleting?: boolean;
    onUpdateChecklistItem?: (listId: string, taskId: string, checklistItemId: string, isChecked: boolean) => void;
    updatingChecklistItemId?: string | null;
    onEdit?: (task: Task | EnrichedTask) => void;
    onUpdateChecklistItemName?: (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => void;
    onFocus?: (task: Task | EnrichedTask) => void;
}) => {
    const enriched = isEnriched(task);

    const dueDate = parseGraphApiDate(task.dueDateTime);
    const isOverdue = dueDate && isPast(endOfDay(dueDate));
    const startDate = enriched && task.startDate && task.startDate !== 'None' ? new Date(task.startDate.replace(/-/g, '\/')) : null;

    const getDescription = (content: string) => {
        const parts = content.split('---');
        if (parts.length > 2) {
            return parts[2].trim();
        }
        return content;
    };

    const description = getDescription(task.body.content);
    const subtasks = task.checklistItems || [];
    const completedSubtasks = subtasks.filter(item => item.isChecked).length;
    const progress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

    return (
        <Card
            className="mb-4 text-left bg-card/60 backdrop-blur-sm border-l-4 hover:bg-card/80 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1"
            style={{borderLeftColor: enriched ? (CONTEXT_COLORS[task.context as keyof typeof CONTEXT_COLORS] || '#9ca3af') : 'transparent'}}
        >
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                        {onComplete && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-full border-muted-foreground/50 hover:bg-green-500/20 hover:border-green-500 group"
                                onClick={() => onComplete(task.listId, task.id)}
                                disabled={isCompleting}
                                title="Complete Task"
                            >
                                {isCompleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <Check className="h-4 w-4 text-muted-foreground group-hover:text-green-400"/>
                                )}
                            </Button>
                        )}
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span>{task.title}</span>
                            {onEnrich && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => onEnrich(task)}
                                    disabled={isEnriching}
                                    title={enriched ? "Re-enrich with AI" : "Enrich with AI"}
                                >
                                    {isEnriching ? (
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                    ) : (
                                        <Sparkles className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                    )}
                                </Button>
                            )}
                            {onEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => onEdit(task)}
                                    title="Edit Task"
                                >
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                </Button>
                            )}
                            {onFocus && enriched && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => onFocus(task)}
                                    title="Focus on Task"
                                >
                                    <Focus className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                                </Button>
                            )}
                        </CardTitle>
                    </div>
                    <Badge variant="secondary" className="flex items-center whitespace-nowrap shrink-0">
                        <List className="w-3 h-3 mr-1"/> {task.listName}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
                {enriched && (
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline" className="flex items-center">
                            <Clock className="w-3 h-3 mr-1"/> {task.estTime} min
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1"/> Urgency: {task.urgency}
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                            <Star className="w-3 h-3 mr-1"/> Importance: {task.importance}
                        </Badge>
                        <Badge variant="outline" className="flex items-center"
                               style={{borderColor: ENERGY_COLORS[task.energy as keyof typeof ENERGY_COLORS]}}>
                            <Zap className="w-3 h-3 mr-1"/> {task.energy}
                        </Badge>
                        <Badge variant="outline" className="flex items-center"
                               style={{borderColor: CONTEXT_COLORS[task.context as keyof typeof CONTEXT_COLORS]}}>
                            <Tag className="w-3 h-3 mr-1"/> {task.context}
                        </Badge>
                    </div>
                )}
                {subtasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Subtasks</span>
                            <span>{completedSubtasks} / {subtasks.length}</span>
                        </div>
                        <Progress value={progress} className="h-2"/>
                        <div className="space-y-1 pt-2">
                            {subtasks.map((item, index) => {
                                const isBlocked = enriched && task.sequence !== undefined && index > 0 && !subtasks[index - 1].isChecked;
                                return (
                                    <ChecklistItem
                                        key={item.id}
                                        item={item}
                                        listId={task.listId}
                                        taskId={task.id}
                                        onUpdate={onUpdateChecklistItem!}
                                        onUpdateName={onUpdateChecklistItemName!}
                                        isUpdating={updatingChecklistItemId === item.id}
                                        sequence={enriched ? task.sequence : undefined}
                                        isBlocked={isBlocked}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
            {(enriched || dueDate) && (
                <CardFooter
                    className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {enriched && <span>Score: {task.score.toFixed(0)}</span>}
                        {startDate && (
                            <span className="flex items-center text-sky-400">
                  <CalendarPlus className="w-3 h-3 mr-1"/>
                  Starts {format(startDate, 'MMM d')}
                </span>
                        )}
                    </div>
                    {dueDate && (
                        <span className={`flex items-center ${isOverdue ? 'text-destructive' : ''}`}>
                    <Calendar className="w-3 h-3 mr-1"/>
                    Due {format(dueDate, 'MMM d')} ({formatDueDateDistance(dueDate)})
                </span>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};