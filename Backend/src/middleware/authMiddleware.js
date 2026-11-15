import jwt from "jsonwebtoken";
import pool from "../config/db.js";
export function verifyAccessToken(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: Access token missing" });
  }
  try 
  {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) 
  {
    return res.status(401).json({ success: false, message: "Access token expired or invalid" });
  }
}
export async function verifyPremiumUser(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT is_premium FROM users WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0 || !rows[0].is_premium) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Premium membership required.",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error verifying premium status.",
    });
  }
}
