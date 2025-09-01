import { CalendarEvent } from "@/types";

const CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3";

/**
 * A helper function to make authenticated requests to the Google API.
 */
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
        // If the token is expired or invalid, Google often returns a 401 or 403.
        if (response.status === 401 || response.status === 403) {
            throw new Error("Google authentication error. Your session may have expired.");
        }
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `Request failed with status: ${response.statusText}`;
        throw new Error(errorMessage);
    }

    return response.json();
};

/**
 * Fetches today's events from ALL of the user's Google Calendars.
 * This is the new, integrated function.
 */
export const getTodaysEvents = async (accessToken: string): Promise<CalendarEvent[]> => {
    const calendarListUrl = `${CALENDAR_API_BASE_URL}/users/me/calendarList`;
    const calendarListData = await fetchWithAuth(calendarListUrl, accessToken);
    const calendars = calendarListData.items || [];

    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString(); // From start of day
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString(); // To end of day

    const eventPromises = calendars.map((calendar: { id: string }) => {
        const url = `${CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
        return fetchWithAuth(url, accessToken);
    });

    const results = await Promise.all(eventPromises);

    const allEvents = results.flatMap(result => result.items || []);

    allEvents.sort((a, b) => {
        const startTimeA = new Date(a.start.dateTime || a.start.date).getTime();
        const startTimeB = new Date(b.start.dateTime || b.start.date).getTime();
        return startTimeA - startTimeB;
    });

    return allEvents;
};