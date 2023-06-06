const express = require('express');
const https = require('https');
const { createParser } = require('eventsource-parser');
const cors = require('cors');
const fs = require('fs');
// require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const sys_prompt = fs.readFileSync('prompt.txt', 'utf8');
const preloaded_message_history = JSON.parse(fs.readFileSync('preloaded_message_history.json', 'utf8'));

function generatePrompt(prompt, message_history = []) {

    prompt_messages = [
        { role: "system", content: sys_prompt },
        ...preloaded_message_history,
        ...message_history,
        { role: "user", content: `${prompt}` },
    ]

    return prompt_messages;
}

app.post('/ask', async (req, res) => {
    let { text, message_history } = req.body;

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

    const reqHttps = https.request(options, (response) => {
        const parser = createParser((event) => {
            if (event.type === 'event') {
                if (event.data !== "[DONE]") {
                    const txt = JSON.parse(event.data).choices[0].delta?.content || "" + "\n";
                    console.log(`Received word from GPT: ${txt}`);
                    res.write(txt);
                }
                else {
                    res.end();
                }
            } else if (event.type === 'done') {
                res.end();
            }
        });

        response.on('data', (data) => {
            parser.feed(data.toString());
        });

        response.on('end', () => {
            parser.reset();
            console.log('No more data in response.')
        });
    });

    reqHttps.on('error', (error) => {
        console.error(error);
    });

    MODEL = "gpt-4";


    reqHttps.write(JSON.stringify({
        model: MODEL,
        messages: generatePrompt(text, message_history),
        stream: true,
        n: 1,
    }));

    reqHttps.end();
});

const port = process.env.PORT || 2000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
