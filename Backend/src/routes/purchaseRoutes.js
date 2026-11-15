import express from "express";
import { verifyAccessToken } from "../middleware/authMiddleware.js";
import {createPremiumOrder,updateTransactionStatus} from "../controllers/purchaseController.js";
const router = express.Router();
router.use(verifyAccessToken);
router.post("/premium-membership", verifyAccessToken, createPremiumOrder);
router.post("/update-transaction-status",verifyAccessToken,updateTransactionStatus);
export default router;
