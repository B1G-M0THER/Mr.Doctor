import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import userRoutes from "./routes/auth.js";
import cardRoutes from "./routes/cards.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import http from "http"; // Додано
import { Server } from "socket.io"; // Додано
import initializeSocket from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Налаштування CORS для Socket.IO (дозволити з вашого фронтенду)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // ВАЖЛИВО: Замініть на URL вашого фронтенду!
        methods: ["GET", "POST"]
    }
});

// Ініціалізація обробників Socket.IO
initializeSocket(io);


app.use(cors());
app.use(bodyParser.json());
app.use("/api", userRoutes);
app.use("/api/cards", cardRoutes);
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.send("Server is running!");
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});