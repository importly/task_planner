import {EnrichedTask, Task} from "@/types";

// Parses the custom properties from a task's notes.
export const parseTaskProperties = (
    content: string,
): Omit<EnrichedTask, keyof Task | "score"> | null => {
    const propertiesBlockRegex = /---([\s\S]*?)---/;
    const keyValueRegex = /(EstTime|Urgency|Importance|Energy|Context|StartDate|sequence|parentTaskId|suggestedStart):\s*(\S+)/g;

    const blockMatch = content.match(propertiesBlockRegex);
    if (!blockMatch) return null;

    const props: any = {};
    let match;
    while ((match = keyValueRegex.exec(blockMatch[1])) !== null) {
        const [, key, value] = match;
        const lowerKey = key.toLowerCase();
        if (["esttime", "urgency", "importance", "sequence"].includes(lowerKey)) {
            props[lowerKey] = parseInt(value, 10);
        } else {
            props[lowerKey] = value;
        }
    }

    if (props.esttime && props.urgency && props.importance) {
        return {
            estTime: props.esttime,
            urgency: props.urgency,
            importance: props.importance,
            energy: props.energy || "medium",
            context: props.context || "none",
            startDate: props.startdate,
            sequence: props.sequence,
            parentTaskId: props.parenttaskid,
            suggestedStart: props.suggestedstart,
        };
    }

    return null;
};

// Calculates the priority score for a task based on the defined algorithm.
export const calculateScore = (task: Omit<EnrichedTask, "score">, allTasks: EnrichedTask[] = []): number => {
    const {urgency, importance, dueDateTime, context, id} = task;
    let urgencyBoost = 0;
    let contextSwitchPenalty = 0;

    if (dueDateTime?.dateTime) {
        const dueDate = new Date(dueDateTime.dateTime);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            // Overdue or due today gets a massive boost.
            urgencyBoost = 150;
        } else if (diffDays <= 14) {
            // Due within the next 14 days. The boost is inversely proportional to the number of days away.
            // e.g., due tomorrow (diffDays=1) gets +100, due in 7 days gets ~+14.
            urgencyBoost = Math.round(100 / diffDays);
        }
    }

    const taskIndex = allTasks.findIndex(t => t.id === id);
    if (taskIndex > 0) {
        const prevTask = allTasks[taskIndex - 1];
        if (prevTask.context !== context) {
            contextSwitchPenalty = 5; // Penalize context switching
        }
    }

    return urgency * 10 + importance * 8 + urgencyBoost - contextSwitchPenalty;
};

// Maps the numeric importance score to the values expected by Microsoft To Do.
export const mapImportance = (level: number): 'low' | 'normal' | 'high' => {
    if (level <= 3) return 'low';
    if (level <= 7) return 'normal';
    return 'high';
};

// Processes a list of raw tasks into enriched and review categories.
export const processTasks = (rawTasks: (Task & { listId: string; listName: string })[]) => {
    const enriched: EnrichedTask[] = [];
    const reviewList: Task[] = [];

    rawTasks.forEach((task) => {
        const customProps = parseTaskProperties(task.body.content);
        if (customProps) {
            const enrichedTaskData = {...task, ...customProps} as Omit<EnrichedTask, 'score'>;
            enriched.push({...enrichedTaskData, score: 0}); // Score calculated later
        } else {
            reviewList.push(task as Task);
        }
    });

    const scoredTasks = enriched.map(task => ({
        ...task,
        score: calculateScore(task, enriched)
    }));

    return {
        enrichedTasks: scoredTasks.sort((a, b) => b.score - a.score),
        reviewTasks: reviewList,
    };
};

export const extractTimeFromDisplayName = (displayName: string): number | null => {
    const match = displayName.match(/\((\d+)\s*min\)/);
    return match ? parseInt(match[1], 10) : null;
};

export const buildTaskHierarchy = (tasks: EnrichedTask[]): EnrichedTask[] => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const hierarchy: EnrichedTask[] = [];

    tasks.forEach(task => {
        if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
            const parent = taskMap.get(task.parentTaskId);
            if (parent) {
                parent.checklistItems = parent.checklistItems || [];
                // This is a conceptual mapping; actual subtask items are handled in usePlanner
            }
        } else {
            hierarchy.push(task);
        }
    });
    return hierarchy;
};