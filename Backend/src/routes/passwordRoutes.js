import express from "express";
import {
  forgotPassword,
  getResetPasswordForm,
  updatePassword,
} from "../controllers/passwordController.js";
const router = express.Router();
router.post("/forgotpassword", forgotPassword);
router.get("/resetpassword/:id", getResetPasswordForm);
router.post("/updatepassword/:id", updatePassword);
export default router;
