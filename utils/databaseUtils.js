import { dbQueryPool } from "../services/database.js";

export async function validateUserID(userID) {
    // check if the user exists in the database
    const [rows] = await dbQueryPool.execute('SELECT * FROM users WHERE user_id = ?;', [userID]);

    if (rows.length > 0) {
        return true;
    }
    else if (rows.length == 0) {
        return false;
    }
    else {
        console.error(`Found multiple users with user_id = ${userID}`);
        return false;
    }
}

export async function getMessageListFromDB(userID) {
    const [rows] = await dbQueryPool.execute('SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC;', [userID]);

    if (rows.length == 0) {
        return [];
    }

    return rows.map(row => {
        return {
            role: row.role,
            content: row.content,
            commandID: row.command_id,
            timestamp: row.timestamp
        };
    });
}

export async function saveMessageHistoryToDB(userID, messageHistory) {
    // delete all messages from the user
    try {
        await dbQueryPool.execute('DELETE FROM messages WHERE user_id = ?;', [userID]);
        console.log(`Deleted all messages from database for user ${userID}`);
    }
    catch (err) {
        console.error(err);
    }

    try {
        // insert all messages from the user, waiting for each one to finish
        const promises = messageHistory.messageHistory.map(async message => {
            await dbQueryPool.execute('INSERT INTO messages (user_id, role, content, command_id, timestamp) VALUES (?, ?, ?, ?, ?);', [userID, message.role, message.content, message.commandID, message.timestamp]);
            console.log(`Saved message to database: ${JSON.stringify(message)}, user_id = ${userID}`);
        });
        await Promise.all(promises);

    }
    catch (err) {
        console.error(err);
    }
}