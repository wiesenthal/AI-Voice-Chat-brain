import MessageHistory from '../models/MessageHistory.js';
import { setHeadersForOpenAI } from '../configuration/openaiRequestConfig.js';

import { preparePrompt } from '../utils/promptUtils.js';
import SessionManager from '../models/SessionManager.js';
import { getResponseFromOpenAI } from '../services/openAIWrapper.js';

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
    console.log(`Collected response: ${collectedResponse}`);
    res.end();
    // response is over
    if (!SessionManager.isCommandCancelled(userID, commandID)) {
      console.log(`Command ${commandID} was not cancelled, storing message history, `);
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