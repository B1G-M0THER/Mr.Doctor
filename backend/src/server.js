import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import userRoutes from "./routes/auth.js";
import authRoutes from "./routes/auth.js";
import cardRoutes from "./routes/cards.js";
import adminRoutes from "./routes/admin.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import http from "http";
import { Server } from "socket.io";
import initializeSocket from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // ВАЖЛИВО: Замінить на URL фронтенду!
        methods: ["GET", "POST"]
    }
});

initializeSocket(io);

app.use(cors());
app.use(bodyParser.json());
app.use("/api", userRoutes);
app.use("/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/transactions", transactionRoutes);

app.get("/", (req, res) => {
    res.send("Server is running!");
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});