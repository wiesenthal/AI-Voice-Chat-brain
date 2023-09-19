import { readFileSync } from 'fs';

const sysPrompt = readFileSync('prompt.txt', 'utf8');
const preloadedMessageHistory = JSON.parse(readFileSync('preloadedMessageHistory.json', 'utf8'));

export function preparePrompt(prompt, messageHistory = []) {
    let prompt_messages = [
        { role: "system", content: sysPrompt },
        ...preloadedMessageHistory,
        ...messageHistory,
        { role: "user", content: `${prompt}` },
    ]

    return prompt_messages;
}