import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import { formatDistanceToNow, isToday, isTomorrow, isYesterday, startOfDay } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Parses a dateTimeTimeZone object from the Microsoft Graph API into a JS Date object.
 * @param dateTime The dateTimeTimeZone object from the Graph API.
 * @returns A Date object or null if the input is invalid.
 */
export const parseGraphApiDate = (dateTime?: { dateTime: string; timeZone: string }): Date | null => {
    if (!dateTime?.dateTime) {
        return null;
    }
    return new Date(dateTime.dateTime);
};

/**
 * Formats the distance to a due date in a human-friendly way (e.g., "due tomorrow").
 * @param dueDate The date to format.
 * @returns A user-friendly string representing the time until the due date.
 */
export const formatDueDateDistance = (dueDate: Date): string => {
    const dueDateStartOfDay = startOfDay(dueDate);

    if (isToday(dueDateStartOfDay)) {
        return "due today";
    }
    if (isTomorrow(dueDateStartOfDay)) {
        return "due tomorrow";
    }
    if (isYesterday(dueDateStartOfDay)) {
        return "was due yesterday";
    }
    
    return formatDistanceToNow(dueDateStartOfDay, { addSuffix: true });
};