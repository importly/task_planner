import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Check, Loader2, Pencil, X} from "lucide-react";
import {useMemo, useState} from "react";
import {ChecklistItem as ChecklistItemType} from "@/types";

interface ChecklistItemProps {
    item: ChecklistItemType;
    listId: string;
    taskId: string;
    onUpdate: (listId: string, taskId: string, checklistItemId: string, isChecked: boolean) => void;
    onUpdateName: (listId: string, taskId: string, checklistItemId: string, newDisplayName: string) => void;
    isUpdating: boolean;
    sequence?: number;
    isBlocked?: boolean;
}

export const ChecklistItem = ({
                                  item,
                                  listId,
                                  taskId,
                                  onUpdate,
                                  onUpdateName,
                                  isUpdating,
                                  sequence,
                                  isBlocked
                              }: ChecklistItemProps) => {
    const [isEditing, setIsEditing] = useState(false);

    const {title, time} = useMemo(() => {
        const match = item.displayName.match(/(.*) \((\d+)\s*min\)$/);
        if (match) {
            return {title: match[1].trim(), time: `${match[2]} min`};
        }
        return {title: item.displayName, time: null};
    }, [item.displayName]);

    const [newTitle, setNewTitle] = useState(title);

    const handleCheckedChange = (checked: boolean) => {
        onUpdate(listId, taskId, item.id, !!checked);
    };

    const handleSave = () => {
        const newDisplayName = time ? `${newTitle.trim()} (${time})` : newTitle.trim();
        if (newDisplayName !== item.displayName && newTitle.trim() !== "") {
            onUpdateName(listId, taskId, item.id, newDisplayName);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setNewTitle(title);
    };

    if (isEditing) {
        return (
            <div className="flex items-center justify-between p-2 rounded-md bg-black/30 -mx-2">
                <div className="flex items-center gap-3 flex-grow">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                        }}
                        autoFocus
                    />
                </div>
                <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}><Check
                        className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}><X
                        className="h-4 w-4"/></Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-between p-2 rounded-md hover:bg-black/20 transition-colors -mx-2 group ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center gap-3">
                {sequence && <span className="text-xs font-bold text-muted-foreground">{sequence}.</span>}
                {isUpdating ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary"/>
                    </div>
                ) : (
                    <Checkbox
                        id={item.id}
                        checked={item.isChecked}
                        onCheckedChange={handleCheckedChange}
                        disabled={isUpdating || isBlocked}
                        title={isBlocked ? "Complete previous steps first" : ""}
                    />
                )}
                <label
                    htmlFor={item.id}
                    className={`text-sm font-medium leading-none ${!isBlocked ? 'cursor-pointer' : 'cursor-not-allowed'} ${item.isChecked ? 'line-through text-muted-foreground' : ''}`}
                >
                    {title}
                </label>
            </div>
            <div className="flex items-center">
                {time && <span className="text-xs text-muted-foreground mr-2">{time}</span>}
                <Button variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        onClick={() => !isBlocked && setIsEditing(true)} disabled={isBlocked}>
                    <Pencil className="h-3 w-3"/>
                </Button>
            </div>
        </div>
    );
};