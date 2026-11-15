import express from "express";
import {initiateSignup,verifyOtp, setPassword,loginUser,refreshAccessToken,getCurrentUser,logoutUser,} from "../controllers/authController.js";
import { verifyAccessToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/signup", initiateSignup);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", setPassword);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.get("/me", verifyAccessToken, getCurrentUser);
router.post("/logout", logoutUser);

export default router;
