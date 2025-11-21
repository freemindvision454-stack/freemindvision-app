import express from "express";
import { createLive, getLiveUserSig } from "../controllers/liveController.js";

const router = express.Router();

router.post("/create", createLive);
router.get("/sig/:userId", getLiveUserSig);

export default router;
