import express, { json, urlencoded } from "express";
import cors from "cors";

import router from "./routes/router.js";
import db from "../db/index.js";

const app = express();
const port = Number(process.env.PORT) || 3011;

const defaultOrigins = ["http://localhost:5173", "app://assessly"];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
};

async function main() {
    try {
        await db.connect();
        console.log("Connected to database");
    } catch (error) {
        console.error("Failed to connect to database:", error.message);
        process.exit(1);
    }

    app.use(cors(corsOptions));
    app.use(urlencoded({ extended: true }));
    app.use(json());
    app.get("/", (req, res) => {
        res.send("Hello");
    });
    app.use("/api", router);

    const server = app.listen(port);

    server.on("listening", () => {
        console.log(`Server is running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
        console.error(`Failed to start server on port ${port}:`, error.message);
        process.exit(1);
    });
}

main();

export default app;
