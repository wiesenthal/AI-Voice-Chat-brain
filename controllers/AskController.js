import { request } from 'https';

import MessageHistory from '../models/MessageHistory.js';
import { openAIRequestConfig, setHeadersForOpenAI } from '../configuration/openaiRequestConfig.js';
import { createParser } from 'eventsource-parser';
import { MODEL } from '../configuration/environment.js'
import { preparePrompt } from '../utils/promptUtils.js';
import SessionManager from '../models/SessionManager.js';

async function* getResponseFromOpenAI(formattedContext) {

  let resolveNext;  // Function to resolve the next promise
  const promises = [new Promise(resolve => resolveNext = resolve)];
  
  const reqHttps = request(openAIRequestConfig, (response) => {
    const parser = createParser((event) => {
        if (event.type === 'event') {
            if (event.data !== "[DONE]") {
                const txt = JSON.parse(event.data).choices[0].delta?.content || "" + "\n";
                console.log(`Received word from GPT: ${txt}`);
                resolveNext(txt);  // Resolve the current promise with the chunk
                promises.push(new Promise(resolve => resolveNext = resolve));
            }
            else {
                resolveNext(null);  // Resolve the current promise with null
                promises.push(new Promise(resolve => resolveNext = resolve));
            }
        } else if (event.type === 'done') {
          // I don't think this is ever called
            console.log('Received done event');
            resolveNext(null);  // Resolve the current promise with null
            promises.push(new Promise(resolve => resolveNext = resolve));
        } else {
            console.log(`Received unknown event: ${event}`);
        }
    });

    response.on('data', (data) => {
        // above fails if the response is not JSON, make it safe
        if (data.toString().replace(/\s+/g,'').startsWith('{"error"')) {
            console.error(`Received error from GPT: ${data.toString()}`);
            resolveNext(null);  // Resolve the current promise with null
            promises.push(new Promise(resolve => resolveNext = resolve));
            return;
        }

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

  reqHttps.write(JSON.stringify({
      model: MODEL,
      messages: formattedContext,
      stream: true,
      n: 1,
  }));
  reqHttps.end();

  try {
    for (let promise of promises) {
      yield await promise;
    }
    } finally {
    reqHttps.destroy();
  }
}

class AskController {
  static async ask(req, res) {
    let { text, userID, commandID } = req.body;
    const receiveTimestamp = Date.now();
    if (text === undefined) {
      res.status(400).send("Bad Request, text is undefined");
      return;
    }

    const messageHistory = await MessageHistory.load(userID, SessionManager);
    const formattedContext = preparePrompt(text, messageHistory.getGPTFormattedMessages());
    console.log(`Got message history for user ${userID}, messageHistory: `, messageHistory);
    console.log(`Received text: ${text}. User ID: ${userID}. Command ID: ${commandID}.`);

    setHeadersForOpenAI(res);

    const generator = getResponseFromOpenAI(formattedContext);
    let collectedResponse = "";
    for await (const response of generator) {
      if (SessionManager.isCommandCancelled(userID, commandID)) {
        console.log(`Command ${commandID} was cancelled, ending response. `);
        break;
      }
      if (response) {
        res.write(response);
        collectedResponse += response;
      }
      else {
        break;
      }
    }
    res.end();
    // response is over
    if (!SessionManager.isCommandCancelled(userID, commandID)) {
      messageHistory.setMessage("user", text, commandID, receiveTimestamp);
      messageHistory.setMessage("assistant", collectedResponse, commandID, Date.now());
      SessionManager.storeMessageHistoryForUser(userID, messageHistory);
    }
    else {
      console.log(`Command ${commandID} was cancelled, not storing message history, `);
    }
  }

}

export default AskController;