import { GoogleGenAI } from '@google/genai';
import { EnrichedTask, Task } from "@/types";

export const getAIEstimates = async (apiKey: string, task: Task | EnrichedTask) => {
    const originalDescription = task.body.content.split('---').pop()?.trim() || '';
    const prompt = `Analyze the following task and provide planning estimates.
Task Title: "${task.title}"
Task Description: "${originalDescription}"

Provide your best estimates for the following properties in a JSON object:
- EstTime: Total estimated time in minutes (integer).
- Urgency: A score from 1 to 10.
- Importance: A score from 1 to 10.
- Energy: 'low', 'medium', or 'high'.
- Context: A single, relevant keyword (e.g., 'work', 'home', 'computer').
- StartDate: (Optional) YYYY-MM-DD format if a specific start date is mentioned, otherwise use "None".
- DueDate: (Optional) YYYY-MM-DD format for the upcoming due date. If a date like "Sep 4" is mentioned and it has already passed this year, assume it's for next year. Otherwise use "None".

IMPORTANT: Do NOT generate subtasks.

Respond ONLY with a valid, raw JSON object. Do not include any other text, explanations, or markdown formatting.

Example response:
{
  "EstTime": 45,
  "Urgency": 7,
  "Importance": 6,
  "Energy": "medium",
  "Context": "email",
  "StartDate": "None",
  "DueDate": "2025-09-04"
}`;

    try {
        const ai = new GoogleGenAI({
            apiKey: apiKey,
        });

        const config = {
            thinkingConfig: {
                thinkingBudget: -1,
            },
        };

        const model = 'gemini-2.5-flash';
        const contents = [
            {
                role: 'user' as const,
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ];

        const response = await ai.models.generateContent({
            model,
            config,
            contents,
        });

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No response from Gemini API.');
        }

        let resultText = response.candidates[0].content.parts[0].text;

        const jsonMatch = resultText.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            throw new Error("Invalid JSON response from AI.");
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to get response from Gemini API.');
    }
};

export const getAIBulkTasks = async (apiKey: string, userInput: string, listNames: string[], defaultListName: string) => {
    const listNamesString = listNames.join(', ');
    const prompt = `You are an intelligent task creation assistant. Analyze the user's message and extract all the tasks they want to create. The user might provide multiple tasks in a single message. For each task, identify its title, a detailed description (body), and the target list name.

User's message:
"""
${userInput}
"""

Respond with a valid, raw JSON object containing a single key "tasks". The value of "tasks" should be an array of objects. Each object in the array represents a single task and must have the following properties:
- "title": A concise title for the task (string).
- "body": A detailed description for the task. If no description is provided, create a brief one based on the title (string).
- "listName": The name of the Microsoft To Do list this task should be added to. If the user doesn't specify a list, use your best judgment to categorize it into one of the following available lists: ${listNamesString}. If no list seems appropriate, use the default list: "${defaultListName}".

CRITICAL: Respond ONLY with the JSON object. Do not include any other text, explanations, or markdown formatting.

Example response:
{
  "tasks": [
    {
      "title": "Buy groceries",
      "body": "Need to buy milk, eggs, and bread from the store.",
      "listName": "Shopping"
    },
    {
      "title": "Finish Q3 report",
      "body": "Complete the financial analysis and write the summary for the Q3 report.",
      "listName": "Work"
    }
  ]
}`;

    try {
        const ai = new GoogleGenAI({
            apiKey: apiKey,
        });

        const model = 'gemini-2.5-pro';
        const contents = [
            {
                role: 'user' as const,
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ];

        const response = await ai.models.generateContent({
            model,
            contents,
        });

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No response from Gemini API.');
        }

        let resultText = response.candidates[0].content.parts[0].text;

        const jsonMatch = resultText.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            throw new Error("Invalid JSON response from AI.");
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error calling Gemini API for bulk tasks:', error);
        throw new Error('Failed to get response from Gemini API.');
    }
};