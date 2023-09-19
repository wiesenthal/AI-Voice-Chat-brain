import SessionManager from '../models/SessionManager.js';
import { saveMessageHistoryToDB } from '../utils/databaseUtils.js';

class DisconnectController {
    static async disconnect(req, res) {
        let { userID } = req.body;
        // should happen on a user disconnect
        console.log(`Received disconnect for user ${userID}`);
        const messageHistory = SessionManager.getMessageHistoryForUser(userID);
        if (!messageHistory) {
            console.log(`Tried to save but no message history found for userID ${userID}`);
            res.status(200).send("OK");
            return;
        }
        saveMessageHistoryToDB(userID, messageHistory);
        SessionManager.clearSessionForUser(userID);
        res.status(200).send("OK");
    }
}

export default DisconnectController;