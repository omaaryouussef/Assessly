import express, { json, urlencoded } from "express";
import cors from "cors";

import router from "./routes/router.js";
import db from "../db/index.js";

const app = express();
const port = 3000;

const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
};

async function main() {
    db.connect();

    app.use(cors(corsOptions));
    app.use(urlencoded({ extended: true }));
    app.use(json());
    app.use("/api", router);
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

main();

export default app;
