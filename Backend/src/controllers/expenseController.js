import pool from "../config/db.js";
export async function addExpense(req, res) {
  try {
    const { amount, description, category } = req.body;
    const userId = req.user.id;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter a valid positive amount.",
        });
    }
    if (!description || description.trim().length < 2) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Description must be at least 2 characters.",
        });
    }
    if (!category || !category.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a category." });
    }

    const [result] = await pool.query(
      "INSERT INTO expenses (user_id, amount, description, category) VALUES (?, ?, ?, ?)",
      [userId, Number(amount).toFixed(2), description.trim(), category.trim()]
    );

    const [rows] = await pool.query(
      "SELECT id, amount, description, category, created_at FROM expenses WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: rows[0],
    });
  } catch (error) {
    console.error("Add Expense Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while adding expense." });
  }
}
export async function getExpense(req,res)
{
     try
     {
        const userId=req.user.id;
        const [expenses]=await pool.query("select id,amount,description,category,created_at from expenses where user_id=? order by created_at desc ,id desc",[userId]);
        return res.status(200).json({success:true,expenses});
     }
     catch(error)
     {
        console.error("get Expenses Erros:",error);
        return res.status(500).json({success:false,message:"Server error while fecthing expense"});
     }
}
export async function deleteExpense(req,res)
{
     try
     {
        const {id}=req.params;
        const userId=req.user.id;
        const [result]=await pool.query("delete from expenses where id=? and user_id=?,[id,userId]");
        if(result.affectedRows===0)
        {
            return res.status(400).json({success:false,message:"Expense not found"});
        }
        return res.status(200).json({success:true,message:"Expense delete successfully"});
     }
     catch(error)
     {
        console.error("Delete expense Error:",error);
        return res.status(500).json({success:false,message:"Server error while deleting expense"});
     }
}
