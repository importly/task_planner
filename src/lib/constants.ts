export const CONTEXT_SWITCH_COST_MINUTES = 3;

export const CONTEXT_COLORS = {
    work: '#3b82f6',
    personal: '#10b981',
    learning: '#f59e0b',
    health: '#ef4444',
    other: '#9ca3af'
};

export const OVERLOAD_THRESHOLD = 1.15;
export const HIGH_ENERGY_LIMIT_PERCENT = 40;

export const ENERGY_LEVELS = ['low', 'medium', 'high'] as const;

export const ENERGY_COLORS = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
};

export const MAX_CONTEXT_SWITCHES_PER_DAY = 8;
