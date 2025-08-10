import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {Button} from "@/components/ui/button";
import {DialogFooter} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Loader2, PlusCircle} from "lucide-react";

const taskFormSchema = z.object({
    title: z.string().min(1, "Title is required."),
    body: z.string().optional(),
    listId: z.string({required_error: "Please select a list."}),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskFormProps {
    taskLists: { id: string; displayName: string }[];
    createTask: (listId: string, title: string, body: string) => Promise<void>;
    onSuccess: () => void;
}

export const CreateTaskForm = ({taskLists, createTask, onSuccess}: CreateTaskFormProps) => {
    const [isCreating, setIsCreating] = useState(false);

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            title: "",
            body: "",
        },
    });

    const onSubmit = async (data: TaskFormValues) => {
        setIsCreating(true);
        await createTask(data.listId, data.title, data.body || "");
        setIsCreating(false);
        onSuccess();
        form.reset();
    };

    // Filter out the "Today's Plan" list as users shouldn't add directly to it.
    const availableLists = taskLists.filter(list => list.displayName !== "Today's Plan");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Buy groceries" {...field} />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="body"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Add any notes or details here..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="listId"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>List</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a list"/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {availableLists.map((list) => (
                                        <SelectItem key={list.id} value={list.id}>
                                            {list.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                        {isCreating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        ) : (
                            <PlusCircle className="mr-2 h-4 w-4"/>
                        )}
                        Create Task
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
};