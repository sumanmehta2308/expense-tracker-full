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
export async function getExpenses(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const offset = (page - 1) * limit;

    
    const [expenses] = await pool.query(
      "SELECT id, amount, description, category, created_at FROM expenses WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
      [userId, limit, offset]
    );

    
    const [[totals]] = await pool.query(
      "SELECT COUNT(*) AS totalCount, COALESCE(SUM(amount), 0) AS totalSpent FROM expenses WHERE user_id = ?",
      [userId]
    );

    const [topCatRows] = await pool.query(
      "SELECT category, SUM(amount) AS catTotal FROM expenses WHERE user_id = ? GROUP BY category ORDER BY catTotal DESC LIMIT 1",
      [userId]
    );

    const totalItems = Number(totals.totalCount);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return res.status(200).json({
      success: true,
      expenses,
      pagination: {
        currentPage: page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        totalSpent: Number(totals.totalSpent),
        totalCount: totalItems,
        topCategory: topCatRows.length > 0 ? topCatRows[0].category : "—",
      },
    });
  } catch (error) {
    console.error("Get Paginated Expenses Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses.",
    });
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
