import pool from "../config/db.js";

export async function getUserLeaderboard(req, res,next) {
  try {
    const [leaderboard] = await pool.query(`
      SELECT 
        u.id,
        u.full_name AS name,
        COALESCE(SUM(e.amount), 0) AS total_expenses
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id
      GROUP BY u.id, u.full_name
      ORDER BY total_expenses DESC, u.id ASC
    `);
    
    return res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (error) {
   return next(error);
  }
}
