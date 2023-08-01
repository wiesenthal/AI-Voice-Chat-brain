import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json } from 'express';
import { AskController } from './AskController.js';
import { DisconnectController } from './DisconnectController.js';
import { CancelCommandController } from './controllers/cancelCommandController.js';
import { saveAllMessageHistories } from './utils/messageHistoryUtils.js';

dotenv.config();

class App {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 2000;
        this.server = null;
    }

    configureMiddleware() {
        this.app.use(cors());
        this.app.use(json());
    }

    configureRoutes() {
        this.app.post('/ask', AskController);
        this.app.post('/disconnect', DisconnectController);
        this.app.post('/cancelCommand', CancelCommandController);
    }

    startServer() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });

        for (let signal of ["SIGTERM", "SIGINT"]) {
            process.on(signal, () => {
                console.log(`Received ${signal}, saving all message histories to DB`);
                saveAllMessageHistories();
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
