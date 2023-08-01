import MessageHistory from "./MessageHistory.js";

class UserSession {
    constructor(userID) {
        this.userID = userID;

        this.messageHistory = new MessageHistory();
        this.cancelledCommands = [];
    }

    getLocalMessageHistory() {
        return this.messageHistory;
    }

    storeMessageHistory(messageHistory) {
        this.messageHistory = messageHistory;
    }

    clear() {
        delete this.messageHistory;
        delete this.cancelledCommands;
    }

    addToCancelledCommands(commandID) {
        if (this.cancelledCommands === undefined) {
            this.cancelledCommands = [commandID];
            console.log('Had to create cancelledCommands for user: ', this.userID);
        }
        else {
            this.cancelledCommands.push(commandID);
            console.log(`New command cancelled: ${commandID}`)
            console.log('cancelledCommands: ', this.cancelledCommands);
        }
    }

    isCommandCancelled(commandID) {
        // check if command is in the session
        if (this.cancelledCommands === undefined) {
            return false;
        }
        else {
            return this.cancelledCommands.includes(commandID);
        }
    }
}

export default UserSession;