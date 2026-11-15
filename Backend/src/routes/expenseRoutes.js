import express from "express";
import {addExpense,getExpense,deleteExpense} from "../controllers/expenseController.js";
import {verifyAccessToken} from "../middleware/authMiddleware.js";
const router=express.Router();
router.use(verifyAccessToken);
router.post("/",addExpense);
router.get("/",getExpense);
router.delete("/:id",deleteExpense);
export default router;