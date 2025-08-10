import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {useReviewData} from '@/hooks/useReviewData';
import {StatsCard} from '@/components/StatsCard';
import {Button} from '@/components/ui/button';
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ArrowLeft, Clock, Loader2, Target, TrendingUp, Zap} from 'lucide-react';
import {
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart as RechartsScatterChart,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {format, parseISO} from 'date-fns';
import {EnergyLevelChart} from '@/components/analytics/EnergyLevelChart';

const COLORS = ['#3B82F6', '#F97316', '#EF4444', '#EAB308', '#22C55E', '#8B5CF6'];

const CustomTooltip = ({active, payload}: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
            <p className="font-bold">{data.title}</p>
            <p className="text-muted-foreground">Urgency: {data.urgency}</p>
            <p className="text-muted-foreground">Importance: {data.importance}</p>
        </div>);
    }
    return null;
};

const Review = () => {
    const [range, setRange] = useState(7);
    const {data, loading, error, goalProgress, habitMetrics, burnoutRisk} = useReviewData(range);

    const analysis = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                totalTasks: 0,
                totalTime: 0,
                avgImportance: 'N/A',
                mostProductiveDay: 'N/A',
                productivityByDay: [],
                contextChartData: [],
                taskSizeChartData: [],
                eisenhowerTasks: [],
            };
        }

        const dailyData: { [key: string]: { tasks: number; time: number } } = {};
        const contextData: { [key: string]: { tasks: number; time: number } } = {};
        const taskSizes = {small: 0, medium: 0, large: 0};
        const eisenhowerTasks: { title: string; urgency: number; importance: number }[] = [];
        let totalTime = 0;
        let totalImportanceSum = 0;

        data.forEach(task => {
            const day = format(parseISO(task.completed_at), 'yyyy-MM-dd');
            const time = task.est_time || 0;
            const importance = task.importance || 0;
            const urgency = task.urgency || 0;

            if (!dailyData[day]) dailyData[day] = {tasks: 0, time: 0};
            dailyData[day].time += time;

            const context = task.context || 'Uncategorized';
            if (!contextData[context]) contextData[context] = {tasks: 0, time: 0};
            contextData[context].time += time;

            if (time > 60) taskSizes.large += 1; else if (time >= 15) taskSizes.medium += 1; else if (time > 0) taskSizes.small += 1;

            if (importance > 0 && urgency > 0) {
                eisenhowerTasks.push({title: task.title, importance, urgency});
            }

            totalTime += time;
            totalImportanceSum += importance;
        });

        const productivityByDay = Object.entries(dailyData)
            .map(([date, values]) => ({
                date: format(parseISO(date), 'MMM d'), time: values.time,
            }))
            .sort((a, b) => parseISO(a.date).valueOf() - parseISO(b.date).valueOf());

        const mostProductiveDay = productivityByDay.reduce((max, day) => (day.time > max.time ? day : max), {
            date: 'N/A',
            time: 0
        });

        const contextChartData = Object.entries(contextData)
            .map(([name, values]) => ({name, time: values.time}))
            .sort((a, b) => b.time - a.time);

        const taskSizeChartData = [{name: 'Small (<15m)', value: taskSizes.small}, {
            name: 'Medium (15-60m)',
            value: taskSizes.medium
        }, {name: 'Large (>60m)', value: taskSizes.large},].filter(d => d.value > 0);

        return {
            totalTasks: data.length,
            totalTime,
            avgImportance: data.length > 0 ? (totalImportanceSum / data.length).toFixed(1) : 'N/A',
            mostProductiveDay: mostProductiveDay.date,
            productivityByDay,
            contextChartData,
            taskSizeChartData,
            eisenhowerTasks,
        };
    }, [data]);

    if (error) {
        return <div className="text-center py-10 text-destructive">Error: {error}</div>;
    }

    return (<div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link to="/"><ArrowLeft className="h-4 w-4"/></Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Productivity Review</h1>
                </div>
                <Tabs defaultValue="7" onValueChange={(val) => setRange(Number(val))}>
                    <TabsList>
                        <TabsTrigger value="7">7 Days</TabsTrigger>
                        <TabsTrigger value="30">30 Days</TabsTrigger>
                        <TabsTrigger value="90">90 Days</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {loading && data.length === 0 ? (<div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            </div>) : (<>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <StatsCard title="Time Invested" value={`${analysis.totalTime} min`}
                               icon={<Clock className="h-4 w-4 text-muted-foreground"/>} loading={loading}
                               description={`Across ${analysis.totalTasks} tasks`}/>
                    <StatsCard title="Focus Score" value={analysis.avgImportance}
                               icon={<Target className="h-4 w-4 text-muted-foreground"/>} loading={loading}
                               description="Avg. importance (1-10)"/>
                    <StatsCard title="Burnout Risk" value={burnoutRisk?.riskLevel || 'N/A'}
                               icon={<Zap className="h-4 w-4 text-muted-foreground"/>} loading={loading}
                               description="Based on high-energy tasks"/>
                    <StatsCard title="Active Goals" value={goalProgress.length}
                               icon={<TrendingUp className="h-4 w-4 text-muted-foreground"/>} loading={loading}
                               description="Goals in progress"/>
                </div>

                {data.length > 0 ? (<div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Energy Levels Per Day</CardTitle>
                            <CardDescription>This chart shows your energy expenditure on tasks each
                                day.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnergyLevelChart data={data} rangeInDays={range}/>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Priority Analysis (Eisenhower Matrix)</CardTitle>
                            <CardDescription>Are you working on what's important, or just what's
                                urgent?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <RechartsScatterChart margin={{top: 20, right: 30, bottom: 20, left: 0}}>
                                    <XAxis type="number" dataKey="urgency" name="Urgency" domain={[0, 10.5]}
                                           tickCount={11} label={{
                                        value: 'Urgency →', position: 'insideBottom', offset: -10
                                    }} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                                    <YAxis type="number" dataKey="importance" name="Importance"
                                           domain={[0, 10.5]} tickCount={11} label={{
                                        value: 'Importance →', angle: -90, position: 'insideLeft'
                                    }} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                                    <Tooltip content={<CustomTooltip/>} cursor={{strokeDasharray: '3 3'}}/>
                                    <ReferenceLine x={5.5} stroke="hsl(var(--border))"
                                                   strokeDasharray="3 3"/>
                                    <ReferenceLine y={5.5} stroke="hsl(var(--border))"
                                                   strokeDasharray="3 3"/>
                                    <Scatter name="Tasks" data={analysis.eisenhowerTasks}
                                             fill="hsl(var(--primary))"/>
                                </RechartsScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>) : (<div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">No data to display</h3>
                    <p className="text-muted-foreground mt-1">Complete some tasks to see your analytics
                        here!</p>
                </div>)}
            </>)}
        </div>
    </div>);
};

export default Review;