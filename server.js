import express, { json } from 'express';
import { request } from 'https';
import { createParser } from 'eventsource-parser';
import cors from 'cors';

import dotenv from 'dotenv';
import { generatePrompt } from './utils/misc.js';
import { getMessageHistoryForUser, storeMessageHistoryForUser, addToCancelledCommands, isCommandCancelled } from './utils/sessionUtils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const MODEL = "gpt-3.5-turbo-16k";

// I want to change this to use simply the user input and user ID (not messageHistory), loading message history from memory or database
app.post('/ask', async (req, res) => {
    let { text, userID, commandID } = req.body;

    const receiveTimestamp = Date.now();

    const messageHistory = getMessageHistoryForUser(userID);
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
            console.log(`Received event: ${event.type}`);
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

            parser.feed(data.toString());
        });

        response.on('end', () => {
            // if command is not cancelled, store the message history
            if (!isCommandCancelled(userID, commandID)) {
                messageHistory.setMessage("user", text, commandID, receiveTimestamp);
                messageHistory.setMessage("assistant", collectedResponse, commandID, Date.now());
                storeMessageHistoryForUser(userID, messageHistory);
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
    console.log(`Formatted message history: ${formattedMessages}`);
    reqHttps.write(JSON.stringify({
        model: MODEL,
        messages: generatePrompt(text, formattedMessages),
        stream: true,
        n: 1,
    }));

    reqHttps.end();
});

app.post('/clearHistory', async (req, res) => {
    let { user } = req.body;
    // should happen on a user disconnect
    // TODO: Should clear the message history from memory and make sure it is backed up in DB
});

app.post('/cancelMessage', async (req, res) => {
    let { user, commandID } = req.body;

    if (user === undefined || commandID === undefined) {
        res.status(400).send("Bad Request");
        return;
    }

    console.log(`Received cancel message for user ${user} and commandID ${commandID}`);
    // ideally should also cancel the request to openai

    addToCancelledCommands(user, commandID);

    const messageHistory = getMessageHistoryForUser(user);

    console.log('Old message history: ', messageHistory);

    messageHistory.removeMessages(commandID);
    storeMessageHistoryForUser(user, messageHistory);

    console.log('New message history: ', messageHistory);

    res.status(200).send("OK");
});

const port = process.env.PORT || 2000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
