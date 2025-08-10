import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useMemo} from 'react';
import {eachDayOfInterval, format, subDays} from 'date-fns';

interface EnergyLevelChartProps {
    data: any[];
    rangeInDays: number;
}

export const EnergyLevelChart = ({data, rangeInDays}: EnergyLevelChartProps) => {
    const chartData = useMemo(() => {
        const interval = eachDayOfInterval({
            start: subDays(new Date(), rangeInDays - 1),
            end: new Date(),
        });

        return interval.map(date => {
            const dateString = format(date, 'yyyy-MM-dd');
            const dayData = data.filter(d => format(new Date(d.completed_at), 'yyyy-MM-dd') === dateString);

            return {
                date: format(date, 'MMM d'),
                low: dayData.filter(d => d.energy === 'low').reduce((sum, d) => sum + (d.est_time || 0), 0),
                medium: dayData.filter(d => d.energy === 'medium').reduce((sum, d) => sum + (d.est_time || 0), 0),
                high: dayData.filter(d => d.energy === 'high').reduce((sum, d) => sum + (d.est_time || 0), 0),
            };
        });
    }, [data, rangeInDays]);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date"/>
                <YAxis/>
                <Tooltip/>
                <Bar dataKey="low" stackId="a" fill="#10b981" name="Low Energy"/>
                <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium Energy"/>
                <Bar dataKey="high" stackId="a" fill="#ef4444" name="High Energy"/>
            </BarChart>
        </ResponsiveContainer>
    );
};