import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
    description?: string;
}

export const StatsCard = ({title, value, icon, loading, description}: StatsCardProps) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <>
                        <Skeleton className="h-8 w-24"/>
                        <Skeleton className="h-4 w-32 mt-2"/>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold">{value}</div>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    </>
                )}
            </CardContent>
        </Card>
    );
};