import { getMessageListFromDB } from "../utils/databaseUtils.js";

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

    isEmpty() {
        return this.messageHistory.length == 0;
    }

    /**
     * Loads the message history for a user from the local session or the database, or creates a new message history
     * @param {string} userID
     * @returns {MessageHistory}
     */
    static async load(userID, sessionManager) {
        
        // check if message history is in the local session, if so use that
        const messageHistory = sessionManager.getMessageHistoryForUser(userID);
        if (messageHistory != null && !messageHistory.isEmpty()) {
            console.log(`Loaded message history from session for user ${userID}`);
            return messageHistory;
        }
        // if not, check if message history is in the database, if so use that
        console.log(`Message history not found in session for user ${userID}, checking database`);
        const messageList = await getMessageListFromDB(userID);
        if (messageList != null) {
            console.log(`Loaded message history from database for user ${userID}`, messageList);
            return new MessageHistory(messageList);
        }

        return new MessageHistory();
    }
}

export default MessageHistory;