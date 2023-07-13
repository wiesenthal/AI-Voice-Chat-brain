import MessageHistory from '../models/MessageHistory.js';

const messageHistoryDict = {}


const cancelledCommandsDict = {}

export function getMessageHistoryForUser(userID) {
    // get message history from the session
    if (messageHistoryDict[userID] === undefined) {
        // TODO: load message history from database
        // if message history not in database
        messageHistoryDict[userID] = new MessageHistory();
        // TODO: add message history to database
    }

    return messageHistoryDict[userID];
}

export function storeMessageHistoryForUser(userID, messageHistory) {
    // store message history in the session
    messageHistoryDict[userID] = messageHistory;
    // TODO: store message history in the database
}

export function addToCancelledCommands(userID, commandID) {
    if (cancelledCommandsDict[userID] === undefined) {
        cancelledCommandsDict[userID] = [commandID];
        console.log('Had to create cancelled_commands: ', cancelledCommandsDict);
    }
    else {
        cancelledCommandsDict[userID].push(commandID);
        console.log(`New command cancelled: ${commandID}`)
        console.log('Cancelled_commands: ', cancelledCommandsDict);
    }
}

export function isCommandCancelled(userID, commandID) {
    // check if command is in the session
    if (cancelledCommandsDict[userID] === undefined) {
        console.log(`Command ${commandID} is not in cancelled_commands`);
        return false;
    }
    else {
        console.log(`Command ${commandID} is in cancelled_commands`);
        return true;
    }
}