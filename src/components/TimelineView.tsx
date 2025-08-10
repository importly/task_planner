import {useEffect, useMemo, useRef, useState} from "react";
import {CalendarEvent, EnrichedTask, Task} from "@/types";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {CalendarX2, Clock} from "lucide-react";
import {format} from "date-fns";
import {CONTEXT_COLORS} from "@/lib/constants";

const MINUTE_TO_PIXEL_SCALE = 3.3;
const START_HOUR = 6; // 6 AM
const END_HOUR = 26; // 2 AM next day
const TOTAL_HOURS = END_HOUR - START_HOUR;

const getHourLabel = (hour: number) => {
    const h24 = hour % 24;
    const period = h24 >= 12 ? 'pm' : 'am';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}${period}`;
};

export const TimelineView = ({tasks, calendarEvents}: {
    tasks: (Task | EnrichedTask)[],
    calendarEvents: CalendarEvent[]
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const {taskLayout, eventLayout, startTimeOffset, totalLevels} = useMemo(() => {
        const currentHour = now.getHours();
        const endHourBoundary = END_HOUR - 24;
        let minutesFromStart = 0;
        if (currentHour >= START_HOUR) {
            minutesFromStart = (currentHour - START_HOUR) * 60 + now.getMinutes();
        } else if (currentHour < endHourBoundary) {
            minutesFromStart = (currentHour + 24 - START_HOUR) * 60 + now.getMinutes();
        }
        const calculatedOffset = minutesFromStart * MINUTE_TO_PIXEL_SCALE;

        // 1. Calculate initial layout for calendar events
        const initialEventLayout = calendarEvents.map(event => {
            const start = new Date(event.start.dateTime);
            const end = new Date(event.end.dateTime);
            let startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
            if (start.getHours() < START_HOUR) startMinutes += 24 * 60;

            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            const offset = startMinutes * MINUTE_TO_PIXEL_SCALE;
            const width = durationMinutes * MINUTE_TO_PIXEL_SCALE;

            return {
                type: 'event' as const,
                item: event,
                offset,
                width,
                duration: durationMinutes,
                title: event.summary
            };
        });

        const blockedIntervals = initialEventLayout.map(e => ({start: e.offset, end: e.offset + e.width}));

        // 2. Flatten enriched tasks into individual schedulable items (tasks or subtasks)
        const sortedParentTasks = (tasks.filter(t => (t as EnrichedTask).estTime) as EnrichedTask[])
            .sort((a, b) => b.score - a.score);

        const schedulableItems: any[] = [];
        sortedParentTasks.forEach(task => {
            const subtasks = task.checklistItems?.filter(item => !item.isChecked) || [];
            if (subtasks.length > 0) {
                subtasks.forEach(subtask => {
                    const match = subtask.displayName.match(/(.*) \((\d+)\s*min\)$/);
                    if (match) {
                        schedulableItems.push({
                            type: 'subtask' as const,
                            id: subtask.id,
                            item: subtask,
                            parentTask: task,
                            title: match[1].trim(),
                            duration: parseInt(match[2], 10),
                        });
                    }
                });
            } else if (task.estTime > 0) {
                schedulableItems.push({
                    type: 'task' as const,
                    id: task.id,
                    item: task,
                    parentTask: task,
                    title: task.title,
                    duration: task.estTime,
                });
            }
        });

        // 3. Calculate layout for tasks/subtasks, avoiding event intervals
        let cumulativeOffset = calculatedOffset;
        let lastContext: string | null = null;
        const initialTaskLayout = schedulableItems.map(schedulableItem => {
            const itemWidth = schedulableItem.duration * MINUTE_TO_PIXEL_SCALE;
            let finalOffset = cumulativeOffset;

            if (lastContext && lastContext !== schedulableItem.parentTask.context) {
                finalOffset += 5 * MINUTE_TO_PIXEL_SCALE; // Context switch cost
            }
            lastContext = schedulableItem.parentTask.context;

            let slotFound = false;
            while (!slotFound) {
                const proposedEnd = finalOffset + itemWidth;
                const conflictingEvent = blockedIntervals.find(
                    interval => finalOffset < interval.end && proposedEnd > interval.start
                );
                if (conflictingEvent) {
                    finalOffset = conflictingEvent.end;
                } else {
                    slotFound = true;
                }
            }
            cumulativeOffset = finalOffset + itemWidth;
            return {
                ...schedulableItem,
                offset: finalOffset,
                width: itemWidth,
            };
        });

        // 4. Combine all items, sort by start time, and assign vertical levels to avoid title overlap
        const allItems = [...initialEventLayout, ...initialTaskLayout].sort((a, b) => a.offset - b.offset);
        const levelEndPositions: number[] = [];
        const finalLayout = allItems.map(item => {
            const labelWidth = item.title.length * 7 + 16;
            let assignedLevel = -1;
            for (let i = 0; i < levelEndPositions.length; i++) {
                if (item.offset >= (levelEndPositions[i] || 0)) {
                    assignedLevel = i;
                    break;
                }
            }
            if (assignedLevel === -1) assignedLevel = levelEndPositions.length;
            levelEndPositions[assignedLevel] = item.offset + labelWidth + 10;
            return {...item, level: assignedLevel};
        });

        return {
            taskLayout: finalLayout.filter(i => i.type === 'task' || i.type === 'subtask'),
            eventLayout: finalLayout.filter(i => i.type === 'event'),
            startTimeOffset: calculatedOffset,
            totalLevels: levelEndPositions.length > 0 ? levelEndPositions.length : 1,
        };
    }, [tasks, calendarEvents, now]);

    useEffect(() => {
        // Only scroll if there's something to scroll to.
        if (scrollContainerRef.current && (taskLayout.length > 0 || eventLayout.length > 0)) {
            const scrollPosition = startTimeOffset - 100;
            scrollContainerRef.current.scrollTo({
                left: scrollPosition > 0 ? scrollPosition : 0,
                behavior: 'auto', // Use 'auto' for more reliable scrolling
            });
        }
    }, [startTimeOffset, taskLayout.length, eventLayout.length]);

    if (taskLayout.length === 0 && eventLayout.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-48 bg-black/20 rounded-lg border border-dashed border-white/10 text-center p-4">
                <CalendarX2 className="h-8 w-8 text-muted-foreground mb-2"/>
                <h4 className="font-semibold">Nothing scheduled yet</h4>
                <p className="text-sm text-muted-foreground">Your timeline is clear. Generate a plan to see your tasks
                    here.</p>
            </div>
        );
    }

    const titleAreaHeight = totalLevels * 22;
    const blockAreaHeight = 32;
    const totalHeight = titleAreaHeight + blockAreaHeight;

    const hours = Array.from({length: TOTAL_HOURS}, (_, i) => i + START_HOUR);

    return (
        <div ref={scrollContainerRef} className="w-full overflow-x-auto pb-4 rounded-lg scrollbar-hide">
            <div
                className="relative bg-black/20 rounded-lg border border-white/10 p-4"
                style={{minWidth: `${TOTAL_HOURS * 60 * MINUTE_TO_PIXEL_SCALE + 50}px`}}
            >
                {/* Hour Labels Container */}
                <div className="relative flex h-6">
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="relative flex-shrink-0"
                            style={{width: `${60 * MINUTE_TO_PIXEL_SCALE}px`}}
                        >
              <span className="absolute top-0 pl-1 text-xs text-muted-foreground">
                {getHourLabel(hour)}
              </span>
                        </div>
                    ))}
                    <div
                        className="absolute top-0 pl-1 text-xs text-muted-foreground"
                        style={{left: `${TOTAL_HOURS * 60 * MINUTE_TO_PIXEL_SCALE}px`}}
                    >
                        {getHourLabel(END_HOUR)}
                    </div>
                </div>

                {/* Main Task Area */}
                <div className="relative" style={{height: `${totalHeight}px`}}>
                    {/* Background Hour Lines */}
                    <div className="absolute top-0 left-0 right-0 h-full flex pointer-events-none">
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                className="h-full flex-shrink-0 border-r border-dashed border-white/10"
                                style={{width: `${60 * MINUTE_TO_PIXEL_SCALE}px`}}
                            ></div>
                        ))}
                    </div>

                    {/* Current Time Indicator */}
                    <div
                        className="absolute top-0 bottom-0 z-0"
                        style={{left: `${startTimeOffset}px`}}
                    >
                        <div className="relative w-px h-full bg-destructive">
                            <Clock
                                className="absolute -top-1 -left-2 h-4 w-4 text-destructive bg-background rounded-full p-0.5"/>
                        </div>
                    </div>

                    {/* Calendar Events */}
                    {eventLayout.map(({item: event, offset, width, duration, level}) => {
                        const titleTop = level * 22;
                        const lineTop = titleTop + 16;
                        const blockTop = titleAreaHeight;
                        const lineHeight = blockTop - lineTop;

                        return (
                            <Popover key={event.id}>
                                <PopoverTrigger asChild>
                                    <div
                                        className="absolute cursor-pointer group"
                                        style={{
                                            left: `${offset}px`,
                                            width: `${width}px`,
                                            top: 0,
                                            height: '100%',
                                            zIndex: 10
                                        }}
                                    >
                                        <p className="absolute text-xs text-muted-foreground group-hover:text-foreground whitespace-nowrap transition-colors"
                                           style={{top: `${titleTop}px`, transform: 'translateX(8px)'}}>
                                            {event.summary}
                                        </p>
                                        <div
                                            className="absolute w-px bg-white/20 transition-colors group-hover:bg-accent"
                                            style={{left: '8px', top: `${lineTop}px`, height: `${lineHeight}px`}}></div>
                                        <div
                                            className="absolute bg-accent/80 rounded-md p-2 border border-accent-foreground/50 shadow-lg flex items-center transition-all duration-300 ease-out group-hover:bg-accent group-hover:scale-105"
                                            style={{
                                                top: `${blockTop}px`,
                                                width: `${width}px`,
                                                height: `${blockAreaHeight}px`,
                                                transformOrigin: 'left'
                                            }}>
                                            <p className="text-xs text-accent-foreground/80 truncate">{Math.round(duration)} min</p>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">{event.summary}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(event.start.dateTime), 'p')} - {format(new Date(event.end.dateTime), 'p')}
                                            </p>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        );
                    })}

                    {/* Task & Subtask Items */}
                    {taskLayout.map(({id, type, title, duration, parentTask, offset, width, level}) => {
                        const titleTop = level * 22;
                        const lineTop = titleTop + 16;
                        const blockTop = titleAreaHeight;
                        const lineHeight = blockTop - lineTop;

                        return (
                            <Popover key={id}>
                                <PopoverTrigger asChild>
                                    <div
                                        className="absolute cursor-pointer group"
                                        style={{
                                            left: `${offset}px`,
                                            width: `${width}px`,
                                            top: 0,
                                            height: '100%',
                                            zIndex: 15
                                        }}
                                    >
                                        <p className="absolute text-xs text-muted-foreground group-hover:text-foreground whitespace-nowrap transition-colors"
                                           style={{top: `${titleTop}px`, transform: 'translateX(8px)'}}>
                                            {title}
                                        </p>
                                        <div
                                            className="absolute w-px bg-white/20 transition-colors group-hover:bg-primary"
                                            style={{left: '8px', top: `${lineTop}px`, height: `${lineHeight}px`}}></div>
                                        <div
                                            className="absolute rounded-md p-2 border border-primary-foreground/50 shadow-lg flex items-center transition-all duration-300 ease-out group-hover:scale-105"
                                            style={{
                                                top: `${blockTop}px`,
                                                width: `${width}px`,
                                                height: `${blockAreaHeight}px`,
                                                transformOrigin: 'left',
                                                backgroundColor: CONTEXT_COLORS[parentTask.context as keyof typeof CONTEXT_COLORS] || '#3b82f6'
                                            }}
                                        >
                                            <p className="text-xs text-primary-foreground/80 truncate">{duration} min</p>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            {type === 'subtask' && (
                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                                    {parentTask.title}
                                                </p>
                                            )}
                                            <h4 className="font-medium leading-none">{title}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Estimated time: {duration} minutes
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <p className="text-sm text-muted-foreground">
                                                Urgency: {parentTask.urgency} | Importance: {parentTask.importance}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Energy: {parentTask.energy} | Context: {parentTask.context}
                                            </p>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};