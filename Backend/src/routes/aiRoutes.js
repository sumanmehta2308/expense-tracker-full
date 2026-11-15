import express from "express";
import { verifyAccessToken } from "../middleware/authMiddleware.js";
import {
  suggestCategory,
  getSpendingInsights,
} from "../controllers/aiController.js";
const router = express.Router();
router.post("/categorize", verifyAccessToken, suggestCategory);
router.get("/insights", verifyAccessToken, getSpendingInsights);
export default router;
