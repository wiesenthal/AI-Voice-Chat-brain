import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json } from 'express';
import AskController from './controllers/AskController.js';
import DisconnectController from './controllers/DisconnectController.js';
import CancelController from './controllers/CancelController.js';
import SessionManager from './models/SessionManager.js';
import { saveMessageHistoryToDB } from './utils/databaseUtils.js';

dotenv.config();

class App {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 2000;
        this.server = null;

        this.alreadyKilled = false;
    }

    configureMiddleware() {
        this.app.use(cors());
        this.app.use(json());
    }

    configureRoutes() {
        this.app.post('/ask', AskController.ask);
        this.app.post('/disconnect', DisconnectController.disconnect);
        this.app.post('/cancelCommand', CancelController.cancelAsk);
    }

    startServer() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });

        this.catchKillSignal();
    }

    catchKillSignal() {
        for (let signal of ["SIGTERM", "SIGINT"])
        { 
            process.on(signal, async () => {
                if (this.alreadyKilled) {
                    console.log(`Received ${signal} again, ignoring so as to not duplicate message history.`);
                    return;
                }
                this.alreadyKilled = true;

                console.log(`Received ${signal}, saving all message histories to DB`);
                for (let [userID, messageHistory] of Object.entries(SessionManager.getAllMessageHistories())) {
                    if (!messageHistory || !userID) {
                        console.log(`Tried to save but no message history found for userID ${userID}`);
                        continue;
                    }
                    await saveMessageHistoryToDB(userID, messageHistory);
                }
                this.server.close((error) => {
                    console.log('Process terminated');
                    process.exit(error ? 1 : 0);
                });
            });
        }
    }

    run() {
        this.configureMiddleware();
        this.configureRoutes();
        this.startServer();
    }
}

const app = new App();
app.run();

export default app.app;  // Export express app for testing or for use in other files
