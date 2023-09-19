import SessionManager from '../models/SessionManager.js';

class CancelController {
    static async cancelAsk(req, res) {
        let { userID, commandID } = req.body;

        console.log(`Received cancel message for user ${userID} and commandID ${commandID}`);

        if (userID === undefined || commandID === undefined) {
            res.status(400).send("Bad Request");
            return;
        }

        SessionManager.addToCancelledCommands(userID, commandID);

        const messageHistory = SessionManager.getMessageHistoryForUser(userID);

        console.log('Old message history: ', messageHistory);

        messageHistory.removeMessages(commandID);
        SessionManager.storeMessageHistoryForUser(userID, messageHistory);

        console.log('New message history: ', messageHistory);

        res.status(200).send("OK");
    }
}

export default CancelController;