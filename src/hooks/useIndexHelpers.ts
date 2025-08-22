import { useMemo } from "react";
import { EnrichedTask, Task } from "@/types";

export const useIndexHelpers = () => {
    const groupTasksByList = (tasks: (Task | EnrichedTask)[]) => {
        return tasks.reduce((acc: { [key: string]: (Task | EnrichedTask)[] }, task) => {
            const listName = (task as any).listName || 'Unknown List';
            if (!acc[listName]) {
                acc[listName] = [];
            }
            acc[listName].push(task);
            return acc;
        }, {});
    };

    const getOrdinalSuffix = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const getDateTimeStrings = (currentTime: Date) => {
        const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
        const dayOfMonth = currentTime.getDate();
        const dateString = `${dayOfWeek}, ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
        const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        return { dateString, timeString };
    };

    const getAllContexts = (availableTasks: (Task | EnrichedTask)[], todaysPlan: (Task | EnrichedTask)[]) => {
        return useMemo(() => {
            const contexts = new Set<string>();
            [...availableTasks, ...todaysPlan].forEach(task => {
                if ('context' in task) {
                    contexts.add((task as EnrichedTask).context);
                }
            });
            return Array.from(contexts);
        }, [availableTasks, todaysPlan]);
    };

    const getPlanTotalTime = (todaysPlan: (Task | EnrichedTask)[]) => {
        return useMemo(() => {
            return todaysPlan.reduce((total, task) => total + ((task as EnrichedTask).estTime || 0), 0);
        }, [todaysPlan]);
    };

    return {
        groupTasksByList,
        getOrdinalSuffix,
        getDateTimeStrings,
        getAllContexts,
        getPlanTotalTime
    };
};
