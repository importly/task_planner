import {CalendarEvent} from "@/types";

const CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3";

const fetchWithAuth = async (url: string, accessToken: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `Request failed with status: ${response.statusText}`;
        throw new Error(errorMessage);
    }

    return response.json();
};

export const getTodaysEvents = async (accessToken: string): Promise<CalendarEvent[]> => {
    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0).toISOString();
    // Use 23:59:59 to capture events ending at midnight
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    const url = `${CALENDAR_API_BASE_URL}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    const data = await fetchWithAuth(url, accessToken);
    return data.items || [];
};