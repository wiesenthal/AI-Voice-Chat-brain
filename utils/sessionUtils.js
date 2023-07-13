import MessageHistory from '../models/MessageHistory.js';

export function getMessageHistoryForUser(req, userID) {
    // get message history from the session
    if (req.session.messageHistory === undefined) {
        // TODO: load message history from database
        // if message history not in database
        req.session.messageHistory = [];
        // TODO: add message history to database
    }
    let messageHistory = new MessageHistory(req.session.messageHistory);

    return messageHistory;
}

export function storeMessageHistoryForUser(req, userID, messageHistory) {
    // store message history in the session
    req.session.messageHistory = messageHistory.messageHistory;
    // TODO: store message history in the database
}

export function addToCancelledCommands(req, commandID) {
    // remove command from the session
    if (req.session.cancelled_commands === undefined) {
        req.session.cancelled_commands = [commandID];
        console.log('Had to create cancelled_commands: ', req.session.cancelled_commands);
    }
    else {
        req.session.cancelled_commands.push(commandID);
        console.log(`New command cancelled: ${commandID}`)
        console.log('Cancelled_commands: ', req.session.cancelled_commands);
    }
}

export function isCommandCancelled(req, commandID) {
    // check if command is in the session
    if (req.session.cancelled_commands === undefined) {
        return false;
    }
    else {
        return req.session.cancelled_commands.includes(commandID);
    }
}