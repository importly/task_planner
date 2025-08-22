import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanner } from "@/hooks/usePlanner";
import { useHotkeys } from "@/hooks/useHotkeys";
import { EnrichedTask, Task } from "@/types";

export const useIndexState = () => {
    const navigate = useNavigate();
    const planner = usePlanner();
    
    const [timeBudget, setTimeBudget] = useState("180");
    const [planGenerated, setPlanGenerated] = useState(false);
    const [optimizeContextSwitches, setOptimizeContextSwitches] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | EnrichedTask | null>(null);
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
    const [tries, setTries] = useState(0);

    // Timer for current time
    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Update time budget from calculated value
    useEffect(() => {
        if (planner.calculatedTimeBudget !== null) {
            setTimeBudget(planner.calculatedTimeBudget.toString());
        }
    }, [planner.calculatedTimeBudget]);

    // Handle tab visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => setIsTabVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Auto-login attempts
    useEffect(() => {
        if (!planner.isLoading && !planner.isAuthenticated && isTabVisible && tries < 4) {
            planner.login();
            setTries(tries + 1);
        }
    }, [planner.isAuthenticated, planner.login, planner.isLoading, isTabVisible, tries]);

    const handleGeneratePlan = () => {
        const budget = parseInt(timeBudget, 10);
        if (!isNaN(budget) && budget > 0) {
            planner.generatePlan(budget);
        }
        setPlanGenerated(true);
    };

    const handleFocus = (task: Task | EnrichedTask) => {
        if ('score' in task) {
            planner.setFocusTask(task);
            navigate("/focus", { state: { task } });
        }
    };

    // Hotkeys configuration
    const hotkeys = useMemo(() => [
        {
            key: 'n',
            altKey: true,
            callback: () => setCreateTaskOpen(true)
        },
        {
            key: 'g',
            altKey: true,
            callback: handleGeneratePlan
        },
        {
            key: 'e',
            altKey: true,
            callback: () => {
                if (!planner.isEnriching && planner.needsReviewTasks.length > 0) {
                    planner.enrichAllReviewTasks();
                }
            }
        },
        {
            key: 'r',
            altKey: true,
            callback: () => {
                if (!planner.isRefreshing) {
                    planner.fetchAndProcessTasks();
                }
            }
        },
        {
            key: 'x',
            altKey: true,
            callback: () => {
                if (!planner.isExporting && planner.todaysPlan.length > 0) {
                    planner.exportPlan();
                }
            }
        }
    ], [
        planner.isEnriching,
        planner.needsReviewTasks,
        planner.enrichAllReviewTasks,
        planner.isRefreshing,
        planner.fetchAndProcessTasks,
        planner.isExporting,
        planner.todaysPlan,
        planner.exportPlan,
        handleGeneratePlan
    ]);

    useHotkeys(hotkeys);

    return {
        ...planner,
        timeBudget,
        setTimeBudget,
        planGenerated,
        setPlanGenerated,
        optimizeContextSwitches,
        setOptimizeContextSwitches,
        currentTime,
        isCreateTaskOpen,
        setCreateTaskOpen,
        editingTask,
        setEditingTask,
        handleGeneratePlan,
        handleFocus
    };
};
