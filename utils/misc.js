import { readFileSync } from 'fs';

const sys_prompt = readFileSync('prompt.txt', 'utf8');
const preloadedMessageHistory = JSON.parse(readFileSync('preloadedMessageHistory.json', 'utf8'));

export function generatePrompt(prompt, messageHistory = []) {
    let prompt_messages = [
        { role: "system", content: sys_prompt },
        ...preloadedMessageHistory,
        ...messageHistory,
        { role: "user", content: `${prompt}` },
    ]

    return prompt_messages;
}