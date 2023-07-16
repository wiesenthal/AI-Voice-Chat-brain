import { getMessageListFromDB } from "../utils/databaseUtils.js";
import { getLocalMessageHistory } from "../utils/sessionUtils.js";

// This class should store and manage the message history for the orchestrator
class MessageHistory {
    constructor(messageHistory = []) {
        this.messageHistory = messageHistory;
    }

    setMessage(role, content, commandID, timestamp) {
        role = role.toLowerCase();
        var index = this.messageHistory.findIndex((element) => {
            return element.commandID == commandID && element.role.toLowerCase() == role;
        });
        if (index == -1)
            this.messageHistory.push({ role: role, content: content, commandID: commandID, timestamp: timestamp });
        else
            this.messageHistory[index].content = content;
    }

    getGPTFormattedMessages() {
        var gpt_formatted_messages = this.messageHistory.map((element) => {
            return { role: element.role.toLowerCase(), content: element.content };
        });
        return gpt_formatted_messages;
    }

    removeMessages(commandID) {
        this.messageHistory = this.messageHistory.filter((element) => {
            return element.commandID != commandID;
        });
    }

    /**
     * Loads the message history for a user from the local session or the database, or creates a new message history
     * @param {string} userID
     * @returns {MessageHistory}
     */
    static async load(userID) {
        
        // check if message history is in the local session, if so use that
        const messageHistory = getLocalMessageHistory(userID);
        if (messageHistory != null) {
            return messageHistory;
        }
        // if not, check if message history is in the database, if so use that
        const messageList = await getMessageListFromDB(userID);
        if (messageList != null) {
            return new MessageHistory(messageList);
        }

        return new MessageHistory();
    }
}

export default MessageHistory;