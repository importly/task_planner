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

CRITICAL: If the total EstTime is greater than 60 minutes, you MUST break the task down into a series of smaller, actionable subtasks.
- The 'subtasks' property should be an array of objects.
- Each object in the 'subtasks' array MUST have 'title' (string) and 'estTime' (integer) properties.
- For subtasks that MUST be completed in a specific order, add a 'sequence' number (integer, starting from 1).
- For subtasks that depend on others, add a 'dependsOn' property, which is an array of strings containing the titles of the subtasks it depends on. Ensure dependencies are logical and not circular.
- The sum of the subtask estTimes should be reasonably close to the total EstTime.
- If the task is small (<= 60 minutes), the 'subtasks' array should be empty or omitted.

Respond ONLY with a valid, raw JSON object. Do not include any other text, explanations, or markdown formatting.

Example for a LARGE task with dependencies:
{
  "EstTime": 180,
  "Urgency": 8,
  "Importance": 9,
  "Energy": "high",
  "Context": "project-launch",
  "StartDate": "None",
  "subtasks": [
    { "title": "Finalize feature A", "estTime": 60, "sequence": 1 },
    { "title": "Test feature A", "estTime": 30, "sequence": 2, "dependsOn": ["Finalize feature A"] },
    { "title": "Develop feature B", "estTime": 45, "sequence": 3 },
    { "title": "Integrate A and B", "estTime": 45, "sequence": 4, "dependsOn": ["Test feature A", "Develop feature B"] }
  ]
}

Example for a SMALL task (<=60 min):
{
  "EstTime": 45,
  "Urgency": 7,
  "Importance": 6,
  "Energy": "medium",
  "Context": "email",
  "StartDate": "None"
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

        const parsedJson = JSON.parse(jsonMatch[0]);

        if (parsedJson.subtasks) {
            validateSubtaskDependencies(parsedJson.subtasks);
            parsedJson.subtasks = sanitizeDependencies(parsedJson.subtasks);
        }

        return parsedJson;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to get response from Gemini API.');
    }
};


function validateSubtaskDependencies(subtasks: any[]) {
    const titles = new Set(subtasks.map(s => s.title));
    for (const subtask of subtasks) {
        if (subtask.dependsOn) {
            for (const dep of subtask.dependsOn) {
                if (!titles.has(dep)) {
                    console.warn(`Invalid dependency: '${dep}' not found. Removing it.`);
                }
            }
        }
    }
}

function sanitizeDependencies(subtasks: any[]) {
    const titles = new Set(subtasks.map(s => s.title));
    return subtasks.map(subtask => {
        if (subtask.dependsOn) {
            subtask.dependsOn = subtask.dependsOn.filter((dep: string) => titles.has(dep));
        }
        return subtask;
    });
}