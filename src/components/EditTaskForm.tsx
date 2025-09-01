import {useMemo, useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {Button} from "@/components/ui/button";
import {DialogFooter} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Calendar as CalendarIcon, Loader2, Save} from "lucide-react";
import {EnrichedTask, Task} from "@/types";
import {format} from "date-fns";
import {cn, parseGraphApiDate} from "@/lib/utils";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";

const editTaskFormSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    estTime: z.coerce.number().min(0, "Must be a positive number."),
    urgency: z.coerce.number().min(1, "Must be between 1-10.").max(10, "Must be between 1-10."),
    importance: z.coerce.number().min(1, "Must be between 1-10.").max(10, "Must be between 1-10."),
    energy: z.enum(["low", "medium", "high"]),
    context: z.string().min(1, "Context is required."),
    startDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
});

type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

const isEnriched = (task: Task | EnrichedTask): task is EnrichedTask => {
    return (task as EnrichedTask).score !== undefined;
};

interface EditTaskFormProps {
    task: Task | EnrichedTask;
    onUpdate: (payload: {
        title: string;
        body: { content: string };
        dueDateTime?: { dateTime: string; timeZone: string } | null
    }) => Promise<void>;
    onSuccess: () => void;
}

export const EditTaskForm = ({task, onUpdate, onSuccess}: EditTaskFormProps) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const {description} = useMemo(() => {
        const parts = task.body.content.split('---');
        if (parts.length > 2) {
            return {description: parts[2].trim()};
        }
        return {description: task.body.content};
    }, [task.body.content]);

    const enrichedTask = isEnriched(task) ? task : null;

    const form = useForm<EditTaskFormValues>({
        resolver: zodResolver(editTaskFormSchema),
        defaultValues: {
            title: task.title,
            description: description,
            estTime: enrichedTask?.estTime || 0,
            urgency: enrichedTask?.urgency || 5,
            importance: enrichedTask?.importance || 5,
            energy: enrichedTask?.energy || "medium",
            context: enrichedTask?.context || "general",
            startDate: enrichedTask?.startDate && enrichedTask.startDate !== 'None' ? new Date(enrichedTask.startDate.replace(/-/g, '\/')) : undefined,
            dueDate: parseGraphApiDate(task.dueDateTime) ?? undefined,
        },
    });

    const onSubmit = async (data: EditTaskFormValues) => {
        setIsUpdating(true);

        const properties = {
            EstTime: data.estTime,
            Urgency: data.urgency,
            Importance: data.importance,
            Energy: data.energy,
            Context: data.context,
            StartDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : 'None'
        };

        const propertiesString = Object.entries(properties).map(([key, value]) => `${key}: ${value}`).join('\n');
        const newBodyContent = `---
${propertiesString}
---
${data.description || ""}`;

        const payload: {
            title: string;
            body: { content: string };
            dueDateTime?: { dateTime: string; timeZone: string } | null;
        } = {
            title: data.title,
            body: {content: newBodyContent},
        };

        if (data.dueDate) {
            const selectedDate = new Date(data.dueDate);
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            // Create a new Date object representing the end of the selected day in UTC.
            // This provides a consistent, unambiguous point in time for the API.
            const utcEndDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            payload.dueDateTime = {
                dateTime: utcEndDate.toISOString(),
                timeZone: 'UTC'
            };
        } else {
            payload.dueDateTime = null;
        }

        await onUpdate(payload);
        setIsUpdating(false);
        onSuccess();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="estTime"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Est. Time (min)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="context"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Context</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="urgency"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Urgency (1-10)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="importance"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Importance (1-10)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="energy"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Energy</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select energy level"/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({field}) => (
                            <FormItem className="flex flex-col pt-2">
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value || undefined}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                        <div className="p-2 border-t border-border">
                                            <Button variant="ghost" className="w-full"
                                                    onClick={() => field.onChange(null)}>Clear</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({field}) => (
                            <FormItem className="flex flex-col pt-2">
                                <FormLabel>Due Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value || undefined}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                        <div className="p-2 border-t border-border">
                                            <Button variant="ghost" className="w-full"
                                                    onClick={() => field.onChange(null)}>Clear</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Add any notes or details here..."
                                    className="resize-none"
                                    rows={4}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        ) : (
                            <Save className="mr-2 h-4 w-4"/>
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
};