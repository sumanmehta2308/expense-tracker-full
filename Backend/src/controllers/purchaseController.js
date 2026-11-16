import crypto from "crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import pool from "../config/db.js";
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);
export async function createPremiumOrder(req, res) {
  try {
    const userId = req.user.id;
    const orderAmount = 499.0;
    const orderId = `ORDER_${userId}_${Date.now()}_${crypto
      .randomBytes(3)
      .toString("hex")}`;

    const [users] = await pool.query(
      "SELECT id, full_name, email, is_premium FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (users[0].is_premium) {
      return res
        .status(400)
        .json({ success: false, message: "You are already a Premium Member!" });
    }
    const request = {
      order_amount: orderAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: String(userId),
        customer_name: users[0].full_name,
        customer_email: users[0].email,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/src/pages/dashboard.html?order_id={order_id}`,
      },
    };
    const cfResponse = await cashfree.PGCreateOrder(request);
    const paymentSessionId = cfResponse.data.payment_session_id;
    await pool.query(
      "INSERT INTO orders (order_id, payment_session_id, user_id, amount, status) VALUES (?, ?, ?, ?, 'PENDING')",
      [orderId, paymentSessionId, userId, orderAmount]
    );
    return res.status(201).json({
      success: true,
      order_id: orderId,
      payment_session_id: paymentSessionId,
    });
  } catch (error) {
   return next(error);
  }
}
export async function updateTransactionStatus(req, res) {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required." });
    }
    const paymentResponse = await cashfree.PGOrderFetchPayments(orderId);
    const payments = paymentResponse.data || [];
    const isSuccess = payments.some((txn) => txn.payment_status === "SUCCESS");
    if (isSuccess) {
      await pool.query(
        "UPDATE orders SET status = 'SUCCESSFUL' WHERE order_id = ? AND user_id = ?",
        [orderId, userId]
      );
      await pool.query("UPDATE users SET is_premium = TRUE WHERE id = ?", [
        userId,
      ]);
      return res.status(200).json({
        success: true,
        status: "SUCCESSFUL",
        message: "Transaction successful! You are now a Premium User.",
      });
    } else {
      await pool.query(
        "UPDATE orders SET status = 'FAILED' WHERE order_id = ? AND user_id = ?",
        [orderId, userId]
      );
      return res.status(400).json({
        success: false,
        status: "FAILED",
        message: "TRANSACTION FAILED",
      });
    }
  } catch (error) {
   next(error);
    if (req.body?.orderId) {
      await pool
        .query(
          "UPDATE orders SET status = 'FAILED' WHERE order_id = ? AND user_id = ?",
          [req.body.orderId, req.user.id]
        )
        .catch(() => {});
    }
    return res.status(500).json({
      success: false,
      status: "FAILED",
      message: "TRANSACTION FAILED",
    });
  }
}
