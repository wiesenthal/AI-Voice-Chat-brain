import UserSession from "./UserSession.js";

/**
 * SessionManager class
 * @class SessionManager
 * @classdesc Stores the session data locally for all users
 * @property {Object} userSesssions - Dictionary of all local sessions for all users
 */
class SessionManager {
    constructor() {
        this.userSessions = {};
    }

    initializeUserSessionIfLacking(userID) {
        if (this.userSessions[userID] === undefined)
            this.userSessions[userID] = new UserSession(userID);
    }

    getMessageHistoryForUser(userID) {
        this.initializeUserSessionIfLacking(userID);
        return this.userSessions[userID].getLocalMessageHistory();
    }

    storeMessageHistoryForUser(userID, messageHistory) {
        this.initializeUserSessionIfLacking(userID);
        this.userSessions[userID].storeMessageHistory(messageHistory);
    }

    clearSessionForUser(userID) {
        this.initializeUserSessionIfLacking(userID);
        this.userSessions[userID].clear();
    }

    clearSessionForAllUsers() {
        for (let userID in this.userSessions) {
            this.userSessions[userID].clear();
        }
    }

    getAllMessageHistories() {
        // return all local message histories from each session
        let allLocalMessageHistories = {};
        for (let userID in this.userSessions) {
            allLocalMessageHistories[userID] = this.userSessions[userID].getLocalMessageHistory();
        }
        return allLocalMessageHistories;
    }

    addToCancelledCommands(userID, commandID) {
        this.initializeUserSessionIfLacking(userID);
        this.userSessions[userID].addToCancelledCommands(commandID);
    }

    isCommandCancelled(userID, commandID) {
        this.initializeUserSessionIfLacking(userID);
        return this.userSessions[userID].isCommandCancelled(commandID);
    }
}

export default SessionManager;