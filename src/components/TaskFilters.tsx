import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskFiltersProps {
    allContexts: string[];
    filter: { context: string };
    setFilter: (filter: any) => void;
    sort: { by: string };
    setSort: (sort: any) => void;
}

export const TaskFilters = ({ allContexts, filter, setFilter, sort, setSort }: TaskFiltersProps) => {
    return (
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">Filter by Context</label>
                    <Select
                        onValueChange={(value) => setFilter({ ...filter, context: value })}
                        defaultValue={filter.context}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Contexts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contexts</SelectItem>
                            {allContexts.map(context => (
                                <SelectItem key={context} value={context}>
                                    {context}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">Sort by</label>
                    <Select
                        onValueChange={(value) => setSort({ ...sort, by: value })}
                        defaultValue={sort.by}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="score">Score</SelectItem>
                            <SelectItem value="due_date">Due Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
