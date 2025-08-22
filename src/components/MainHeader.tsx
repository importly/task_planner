import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalogClock } from "@/components/AnalogClock";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";

interface MainHeaderProps {
    dateString: string;
    timeString: string;
    isRefreshing: boolean;
    onRefresh: () => void;
}

export const MainHeader = ({ dateString, timeString, isRefreshing, onRefresh }: MainHeaderProps) => {
    return (
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
                <AnalogClock />
                <div>
                    <p className="text-xl font-semibold text-muted-foreground">{dateString}</p>
                    <p className="text-4xl font-bold tracking-tighter">{timeString}</p>
                </div>
            </div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="flex items-center justify-between w-full gap-4">
                        <span>Refresh tasks from Microsoft To Do</span>
                        <Kbd>Alt + R</Kbd>
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};
