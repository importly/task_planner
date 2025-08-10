const GRAPH_API_BASE_URL = "https://graph.microsoft.com/v1.0/me/todo";

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
        const errorData = await response.json().catch(() => ({})); // Catch if body is not JSON
        const errorMessage = errorData?.error?.message || `Request failed with status: ${response.statusText}`;
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export const getTaskLists = async (accessToken: string) => {
    const data = await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists`, accessToken);
    return data.value;
};

export const getTasksForList = async (accessToken: string, listId: string) => {
    const data = await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks?$filter=status ne 'completed'&$expand=checklistItems`, accessToken);
    return data.value || [];
};

export const createTaskList = async (accessToken: string, displayName: string) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists`, accessToken, {
        method: 'POST',
        body: JSON.stringify({displayName}),
    });
};

export const createTaskInList = async (accessToken: string, listId: string, taskPayload: any) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks`, accessToken, {
        method: 'POST',
        body: JSON.stringify(taskPayload),
    });
};

export const deleteTask = async (accessToken: string, listId: string, taskId: string) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks/${taskId}`, accessToken, {
        method: 'DELETE',
    });
};

export const updateTask = async (accessToken: string, listId: string, taskId: string, payload: any) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks/${taskId}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};

export const createChecklistItem = async (accessToken: string, listId: string, taskId: string, payload: {
    displayName: string
}) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks/${taskId}/checklistItems`, accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const updateChecklistItem = async (accessToken: string, listId: string, taskId: string, checklistItemId: string, payload: {
    isChecked?: boolean;
    displayName?: string
}) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};

export const deleteChecklistItem = async (accessToken: string, listId: string, taskId: string, checklistItemId: string) => {
    return await fetchWithAuth(`${GRAPH_API_BASE_URL}/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`, accessToken, {
        method: 'DELETE',
    });
};