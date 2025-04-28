import express from "express";
import { createCard } from "../controllers/cardController.js";

const router = express.Router();

// Створення картки
router.post("/create", createCard);

export default router;
