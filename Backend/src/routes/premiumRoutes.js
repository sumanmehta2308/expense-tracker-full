import express from "express";
import {verifyAccessToken,verifyPremiumUser,} from "../middleware/authMiddleware.js";
import { getUserLeaderboard } from "../controllers/premiumController.js";
const router = express.Router();
router.get("/show-leaderboard",verifyAccessToken,verifyPremiumUser,getUserLeaderboard
);
export default router;
