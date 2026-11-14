import express from "express";
import {
  initiateSignup,
  verifyOtp,
  setPassword,
  loginUser,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", initiateSignup);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", setPassword);
router.post("/login", loginUser);

export default router;
