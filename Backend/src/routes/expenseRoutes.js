import express from "express";
import {addExpense,getExpenses,deleteExpense} from "../controllers/expenseController.js";
import {verifyAccessToken} from "../middleware/authMiddleware.js";
const router=express.Router();
router.use(verifyAccessToken);
router.post("/",addExpense);
router.get("/",getExpenses);
router.delete("/:id",deleteExpense);
export default router;