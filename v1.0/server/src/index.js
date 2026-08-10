import express, { json, urlencoded } from "express";
import cors from "cors";
import session from "express-session";

import router from "./routes/router.js";
import db from "../db/index.js";
import passport from "./auth/googleStrategy.js";

const app = express();
const port = Number(process.env.PORT) || 3011;

const defaultOrigins = [
    "http://localhost:5173",
    "https://assessly-auc.vercel.app",
    "app://assessly",
];

function normalizeOrigin(origin) {
    return String(origin || "")
        .trim()
        .replace(/\/$/, "");
}

const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

function isOriginAllowed(origin) {
    const normalized = normalizeOrigin(origin);

    if (!normalized || allowedOrigins.includes(normalized)) {
        return true;
    }

    // Allow Vercel production + preview URLs when configured as *.vercel.app
    if (
        allowedOrigins.includes("*.vercel.app") &&
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)
    ) {
        return true;
    }

    return false;
}

const corsOptions = {
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }

        // Reject without throwing so the preflight still gets a CORS response.
        callback(null, false);
    },
    credentials: true,
};

if (!process.env.SESSION_SECRET) {
    console.warn(
        "SESSION_SECRET is not set; using an insecure default for local OAuth only"
    );
}

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

    // Short-lived session for Passport Google OAuth handshake only (app auth remains JWT)
    app.use(
        session({
            secret: process.env.SESSION_SECRET || "assessly-dev-session-secret",
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 10 * 60 * 1000,
                httpOnly: true,
                sameSite: "lax",
            },
        })
    );
    app.use(passport.initialize());
    app.use(passport.session());

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
