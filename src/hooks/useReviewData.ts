import {useCallback, useEffect, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {useMsal} from '@azure/msal-react';
import {subDays} from 'date-fns';
import {BurnoutRisk, GoalProgress, HabitMetric} from '@/types';

export const useReviewData = (rangeInDays: number) => {
    const {accounts} = useMsal();
    const account = accounts[0];
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
    const [habitMetrics, setHabitMetrics] = useState<HabitMetric[]>([]);
    const [burnoutRisk, setBurnoutRisk] = useState<BurnoutRisk | null>(null);

    const fetchData = useCallback(async () => {
        if (!account) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fromDate = subDays(new Date(), rangeInDays).toISOString();

            const {data: completedTasks, error: dbError} = await supabase
                .from('completed_tasks')
                .select('*, energy')
                .eq('user_id', account.localAccountId)
                .gte('completed_at', fromDate)
                .order('completed_at', {ascending: false});

            setData(completedTasks || []);

            // Mocked data fetching for new features
            setGoalProgress([
                {id: '1', title: 'Launch New Feature', targetDate: '2025-09-01', progressPercent: 75},
                {id: '2', title: 'Complete Q3 Report', targetDate: '2025-08-20', progressPercent: 40}
            ]);
            setHabitMetrics([
                {habitKey: 'daily-reading', streakDays: 12, completionRate: 0.85},
                {habitKey: 'morning-exercise', streakDays: 4, completionRate: 0.60}
            ]);
            const highEnergyMinutes = completedTasks?.filter(t => t.energy === 'high').reduce((sum, t) => sum + (t.est_time || 0), 0) || 0;
            setBurnoutRisk({
                riskLevel: highEnergyMinutes > 300 ? 'high' : highEnergyMinutes > 150 ? 'medium' : 'low',
                highEnergyMinutes,
                threshold: 300
            });

        } catch (e: any) {
            console.error("Error fetching review data:", e);
            setError(e.message || "Failed to fetch review data.");
        } finally {
            setLoading(false);
        }
    }, [account, rangeInDays]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {data, loading, error, refresh: fetchData, goalProgress, habitMetrics, burnoutRisk};
};