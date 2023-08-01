import express, { json } from 'express';
import { request } from 'https';
import { createParser } from 'eventsource-parser';
import cors from 'cors';
import { readFileSync } from 'fs';

import dotenv from 'dotenv';
import MessageHistory from './models/MessageHistory.js';
import SessionManager from './models/SessionManager.js';
import { saveMessageHistoryToDB } from './utils/databaseUtils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const MODEL = "gpt-3.5-turbo-16k";

const sysPrompt = readFileSync('prompt.txt', 'utf8');
const preloadedMessageHistory = JSON.parse(readFileSync('preloadedMessageHistory.json', 'utf8'));

const sessionManager = new SessionManager();

function generatePrompt(prompt, messageHistory = []) {
    let prompt_messages = [
        { role: "system", content: sysPrompt },
        ...preloadedMessageHistory,
        ...messageHistory,
        { role: "user", content: `${prompt}` },
    ]

    return prompt_messages;
}

app.post('/ask', async (req, res) => {
    let { text, userID, commandID } = req.body;

    const receiveTimestamp = Date.now();

    const messageHistory = await MessageHistory.load(userID, sessionManager);
    console.log(`Got message history for user ${userID}, messageHistory: `, messageHistory);

    let collectedResponse = "";

    if (text === undefined) {
        res.status(400).send("Bad Request");
        return;
    }

    console.log(`Received text: ${text}`);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
    };

    const reqHttps = request(options, (response) => {
        const parser = createParser((event) => {
            if (event.type === 'event') {
                if (event.data !== "[DONE]") {
                    const txt = JSON.parse(event.data).choices[0].delta?.content || "" + "\n";
                    console.log(`Received word from GPT: ${txt}`);
                    collectedResponse += txt;
                    res.write(txt);
                }
                else {
                    res.end();
                }
            } else if (event.type === 'done') {
                console.log('Received done event');
                // I don't think this is ever called
                res.end();
            } else {
                console.log(`Received unknown event: ${event}`);
            }
        });

        response.on('data', (data) => {
            // above fails if the response is not JSON, make it safe
            if (data.toString().replace(/\s+/g,'').startsWith('{"error"')) {
                console.error(`Received error from GPT: ${data.toString()}`);
                res.end();
                return;
            }

            if (sessionManager.isCommandCancelled(userID, commandID)) {
                console.log(`Command ${commandID} was cancelled, ending response. `);
                reqHttps.destroy();
                res.end();
                return;
            }

            parser.feed(data.toString());
        });

        response.on('end', () => {
            // if command is not cancelled, store the message history
            if (!sessionManager.isCommandCancelled(userID, commandID)) {
                messageHistory.setMessage("user", text, commandID, receiveTimestamp);
                messageHistory.setMessage("assistant", collectedResponse, commandID, Date.now());
                sessionManager.storeMessageHistoryForUser(userID, messageHistory);
            }
            else {
                console.log(`Command ${commandID} was cancelled, not storing message history, `);
            }

            parser.reset();
            console.log('No more data in response.')
        });
    });

    reqHttps.on('error', (error) => {
        console.error(error);
    });

    console.log(`Sending data to GPT: ${text}`);
    const formattedMessages = messageHistory.getGPTFormattedMessages();
    reqHttps.write(JSON.stringify({
        model: MODEL,
        messages: generatePrompt(text, formattedMessages),
        stream: true,
        n: 1,
    }));

    reqHttps.end();
});

app.post('/disconnect', async (req, res) => {
    let { userID } = req.body;
    // should happen on a user disconnect
    // TODO: Should clear the message history from memory and make sure it is backed up in DB
    console.log(`Received disconnect for user ${userID}`);
    const messageHistory = sessionManager.getMessageHistoryForUser(userID);
    if (!messageHistory) {
        console.log(`Tried to save but no message history found for userID ${userID}`);
        res.status(200).send("OK");
        return;
    }
    saveMessageHistoryToDB(userID, messageHistory);
    //clearLocalMessageHistoryForUser(userID);
    sessionManager.clearSessionForUser(userID);
    res.status(200).send("OK");
});

app.post('/cancelCommand', async (req, res) => {
    let { userID, commandID } = req.body;

    console.log(`Received cancel message for user ${userID} and commandID ${commandID}`);

    if (userID === undefined || commandID === undefined) {
        res.status(400).send("Bad Request");
        return;
    }

    sessionManager.addToCancelledCommands(userID, commandID);

    const messageHistory = sessionManager.getMessageHistoryForUser(userID);

    console.log('Old message history: ', messageHistory);

    messageHistory.removeMessages(commandID);
    sessionManager.storeMessageHistoryForUser(userID, messageHistory);

    console.log('New message history: ', messageHistory);

    res.status(200).send("OK");
});

const port = process.env.PORT || 2000;
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// on server shutdown, save all message histories to DB
for (let signal of ["SIGTERM", "SIGINT"])
{
    process.on(signal, () => {
        console.log(`Received ${signal}, saving all message histories to DB`);
        for (let [userID, messageHistory] of Object.entries(sessionManager.getAllMessageHistories())) {
            if (!messageHistory || !userID) {
                console.log(`Tried to save but no message history found for userID ${userID}`);
                continue;
            }
            saveMessageHistoryToDB(userID, messageHistory);
        }
        server.close((error) => {
            console.log('Process terminated');
            process.exit(error ? 1 : 0);
        });
    });
}