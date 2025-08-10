import {DependencyGraph, EnrichedTask, PlannedDayMeta} from '@/types';
import {
  CONTEXT_SWITCH_COST_MINUTES,
  HIGH_ENERGY_LIMIT_PERCENT,
  MAX_CONTEXT_SWITCHES_PER_DAY,
  OVERLOAD_THRESHOLD
} from './constants';

export function groupTasksByContext(tasks: EnrichedTask[]) {
    const groups = new Map<string, EnrichedTask[]>();
    tasks.forEach(task => {
        const context = task.context || 'other';
        if (!groups.has(context)) {
            groups.set(context, []);
        }
        groups.get(context)?.push(task);
    });
    return groups;
}

export function calculateContextSwitchCost(plan: EnrichedTask[]) {
    let totalCost = 0;
    let prevContext = '';

    for (const task of plan) {
        const currentContext = task.context || 'other';
        if (prevContext && currentContext !== prevContext) {
            totalCost += CONTEXT_SWITCH_COST_MINUTES;
        }
        prevContext = currentContext;
    }
    return totalCost;
}

export function optimizeTaskOrder(tasks: EnrichedTask[], timeBudget: number) {
    const contextGroups = groupTasksByContext(tasks);
    const sortedGroups = Array.from(contextGroups.entries())
        .sort((a, b) => b[1][0].score - a[1][0].score);

    let optimizedPlan: EnrichedTask[] = [];
    let remainingBudget = timeBudget;

    for (const [_, groupTasks] of sortedGroups) {
        const groupTime = groupTasks.reduce((sum, task) => sum + task.estTime, 0);
        if (groupTime <= remainingBudget) {
            optimizedPlan.push(...groupTasks);
            remainingBudget -= groupTime;
        } else {
            const partialGroup = groupTasks.filter(task => task.estTime <= remainingBudget);
            optimizedPlan.push(...partialGroup);
            remainingBudget -= partialGroup.reduce((sum, task) => sum + task.estTime, 0);
        }
    }

    return optimizedPlan;
}

export function buildDependencyGraph(tasks: EnrichedTask[]) {
    const graph = new Map<string, string[]>();
    tasks.forEach(task => {
        if (task.parentTaskId) {
            if (!graph.has(task.parentTaskId)) {
                graph.set(task.parentTaskId, []);
            }
            graph.get(task.parentTaskId)?.push(task.id);
        }
    });
    return graph;
}

export function topologicalSort(tasks: EnrichedTask[], dependencies: DependencyGraph) {
    const visited = new Set<string>();
    const result: EnrichedTask[] = [];
    const taskMap = new Map(tasks.map(task => [task.id, task]));

    function visit(taskId: string) {
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const deps = dependencies.get(taskId) || [];
        deps.forEach(depId => visit(depId));

        const task = taskMap.get(taskId);
        if (task) result.push(task);
    }

    tasks.forEach(task => {
        if (!dependencies.has(task.id)) {
            visit(task.id);
        }
    });

    return result;
}

export function calculatePlannedDayMeta(plan: EnrichedTask[], timeBudget: number): PlannedDayMeta {
    const totalMin = plan.reduce((sum, task) => sum + task.estTime, 0);
    const energyLoad = {
        low: plan.filter(t => t.energy === 'low').reduce((sum, task) => sum + task.estTime, 0),
        medium: plan.filter(t => t.energy === 'medium').reduce((sum, task) => sum + task.estTime, 0),
        high: plan.filter(t => t.energy === 'high').reduce((sum, task) => sum + task.estTime, 0)
    };

    const warnings: string[] = [];
    if (totalMin > timeBudget * OVERLOAD_THRESHOLD) {
        warnings.push(`Planned time exceeds budget by ${Math.round((totalMin / timeBudget - 1) * 100)}%`);
    }
    if (energyLoad.high > timeBudget * HIGH_ENERGY_LIMIT_PERCENT / 100) {
        warnings.push(`High-energy tasks exceed recommended limit`);
    }
    if (calculateContextSwitchCost(plan) > MAX_CONTEXT_SWITCHES_PER_DAY * CONTEXT_SWITCH_COST_MINUTES) {
        warnings.push(`Too many context switches may reduce productivity`);
    }

    return {totalMin, energyLoad, warnings};
}

export function detectWorkloadIssues(meta: PlannedDayMeta) {
    return meta.warnings.length > 0;
}

export function generateOptimizedPlan(
    candidates: EnrichedTask[],
    timeBudget: number
) {
    // Phase 1: Candidate selection (handled by usePlanner)
    // Phase 2: Ordering optimization
    let optimized = optimizeTaskOrder(candidates, timeBudget);

    // Apply dependency ordering if needed
    const dependencies = buildDependencyGraph(optimized);
    if (dependencies.size > 0) {
        optimized = topologicalSort(optimized, dependencies);
    }

    // Phase 3: Workload validation
    const meta = calculatePlannedDayMeta(optimized, timeBudget);

    return {
        plan: optimized,
        meta
    };
}