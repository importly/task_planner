export interface ChecklistItem {
    id: string;
    displayName: string;
    isChecked: boolean;
}

export interface Task {
    id: string;
    title: string;
    dueDateTime?: { dateTime: string; timeZone: string };
    body: { content: string; contentType: "text" | "html" };
    listId: string;
    listName: string;
    checklistItems?: ChecklistItem[];
}

export interface EnrichedTask extends Task {
    estTime: number;
    urgency: number;
    importance: number;
    energy: "high" | "medium" | "low" | string;
    context: string;
    score: number;
    startDate?: string;
    sequence?: number;
    parentTaskId?: string;
    suggestedStart?: string;
}

export interface PlannedDayMeta {
    totalMin: number;
    energyLoad: Record<'low' | 'medium' | 'high', number>;
    warnings: string[];
}

export interface GoalProgress {
    id: string;
    title: string;
    targetDate: string;
    progressPercent: number;
}

export interface HabitMetric {
    habitKey: string;
    streakDays: number;
    completionRate: number;
}

export interface BurnoutRisk {
    riskLevel: 'low' | 'medium' | 'high';
    highEnergyMinutes: number;
    threshold: number;
}

export interface ContextSwitchCost {
    fromContext: string;
    toContext: string;
    costMinutes: number;
}

export type DependencyGraph = Map<string, string[]>;

export interface CalendarEvent {
    id: string;
    summary: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
}