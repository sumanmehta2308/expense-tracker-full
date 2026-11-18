import express from "express";
import {
  addExpense,
  getExpenses,
  deleteExpense,
  downloadExpensesS3,
  getDownloadHistory,
} from "../controllers/expenseController.js";
import {verifyAccessToken} from "../middleware/authMiddleware.js";
const router=express.Router();
router.use(verifyAccessToken);
router.post("/",addExpense);
router.get("/",getExpenses);
router.get("/download", verifyAccessToken, downloadExpensesS3);
router.get("/download-history", verifyAccessToken, getDownloadHistory);
router.delete("/:id",deleteExpense);
export default router;