import UserSession from "./UserSession.js";

/**
 * SessionManager class
 * @class SessionManager
 * @classdesc Stores the session data locally for all users
 * @property {Object} userSesssions - Dictionary of all local sessions for all users
 */
class SessionManager {
    static userSessions = {};

    static initializeUserSessionIfLacking(userID) {
        if (SessionManager.userSessions[userID] === undefined) {
            SessionManager.userSessions[userID] = new UserSession(userID);
        }
    }

    static getMessageHistoryForUser(userID) {
        SessionManager.initializeUserSessionIfLacking(userID);
        return SessionManager.userSessions[userID].getLocalMessageHistory();
    }

    static storeMessageHistoryForUser(userID, messageHistory) {
        SessionManager.initializeUserSessionIfLacking(userID);
        SessionManager.userSessions[userID].storeMessageHistory(messageHistory);
    }

    static clearSessionForUser(userID) {
        SessionManager.initializeUserSessionIfLacking(userID);
        SessionManager.userSessions[userID].clear();
    }

    static clearSessionForAllUsers() {
        for (let userID in SessionManager.userSessions) {
            SessionManager.userSessions[userID].clear();
        }
    }

    static getAllMessageHistories() {
        // return all local message histories from each session
        let allLocalMessageHistories = {};
        for (let userID in SessionManager.userSessions) {
            allLocalMessageHistories[userID] = SessionManager.userSessions[userID].getLocalMessageHistory();
        }
        return allLocalMessageHistories;
    }

    static addToCancelledCommands(userID, commandID) {
        SessionManager.initializeUserSessionIfLacking(userID);
        SessionManager.userSessions[userID].addToCancelledCommands(commandID);
    }

    static isCommandCancelled(userID, commandID) {
        SessionManager.initializeUserSessionIfLacking(userID);
        return SessionManager.userSessions[userID].isCommandCancelled(commandID);
    }
}

export default SessionManager;