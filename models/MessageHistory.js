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
}

export default MessageHistory;