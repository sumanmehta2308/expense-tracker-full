import pool from "../config/db.js";
import { uploadToS3 } from "../services/s3Service.js";
export async function addExpense(req, res, next) {
  try {
    const { amount, description, category, note } = req.body;
    const userId = req.user.id;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid positive amount.",
      });
    }
    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 2 characters.",
      });
    }
    if (!category || !category.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a category." });
    }

    const cleanNote = note && note.trim() ? note.trim() : null;

    const [result] = await pool.query(
      "INSERT INTO expenses (user_id, amount, description, category, note) VALUES (?, ?, ?, ?, ?)",
      [
        userId,
        Number(amount).toFixed(2),
        description.trim(),
        category.trim(),
        cleanNote,
      ]
    );

    const [rows] = await pool.query(
      "SELECT id, amount, description, category, note, created_at FROM expenses WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExpenses(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const offset = (page - 1) * limit;

    const [expenses] = await pool.query(
      "SELECT id, amount, description, category, note, created_at FROM expenses WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
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
    return next(error);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [result] = await pool.query(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Expense not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

export async function downloadExpensesS3(req, res, next) {
  try {
    const userId = req.user.id;
    const [expenses] = await pool.query(
      "SELECT amount, description, category, note, created_at FROM expenses WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    const csvRows = [
      ["Date", "Description", "Category", "Note", "Amount (INR)"].join(","),
    ];

    expenses.forEach((exp) => {
      const dateStr = new Date(exp.created_at).toLocaleDateString("en-IN");
      const safeDesc = `"${String(exp.description || "").replace(/"/g, '""')}"`;
      const safeCat = `"${String(exp.category || "").replace(/"/g, '""')}"`;
      const safeNote = `"${String(exp.note || "").replace(/"/g, '""')}"`;
      csvRows.push(
        [dateStr, safeDesc, safeCat, safeNote, exp.amount].join(",")
      );
    });

    const csvString = csvRows.join("\n");
    const fileName = `Expense_${userId}_${Date.now()}.csv`;

    const fileUrl = await uploadToS3(csvString, fileName);

    await pool.query(
      "INSERT INTO downloaded_files (user_id, file_url, file_name) VALUES (?, ?, ?)",
      [userId, fileUrl, fileName]
    );

    return res.status(200).json({
      success: true,
      fileUrl,
      fileName,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDownloadHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const [history] = await pool.query(
      "SELECT id, file_url, file_name, downloaded_at FROM downloaded_files WHERE user_id = ? ORDER BY downloaded_at DESC",
      [userId]
    );

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    return next(error);
  }
}
