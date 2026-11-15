import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendOtpEmail } from "../utils/emailService.js";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: maxAgeMs,
  };
}

export async function initiateSignup(req, res) {
  try {
    const { full_name, email } = req.body;
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 3 characters.",
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    const [existingUsers] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [cleanEmail]
    );
    if(
      existingUsers.length > 0 &&
      existingUsers[0].is_verified &&
      existingUsers[0].password_hash
    ) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered. Please Sign In.",
      });
    }
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    if (existingUsers.length > 0) {
      await pool.query(
        "UPDATE users SET full_name = ?, otp = ?, otp_expiry = ?, is_verified = FALSE WHERE email = ?",
        [cleanName, otp, otpExpiry, cleanEmail]
      );
    } else {
      await pool.query(
        "INSERT INTO users (full_name, email, otp, otp_expiry, is_verified) VALUES (?, ?, ?, ?, FALSE)",
        [cleanName, cleanEmail, otp, otpExpiry]
      );
    }

    sendOtpEmail(cleanEmail, cleanName, otp).catch((err) => {
      console.error("Background OTP Email Error:", err.message);
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email!",
      email: cleanEmail,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while sending OTP." });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sign up first.",
      });
    }

    const user = users[0];

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }
    await pool.query(
      "UPDATE users SET is_verified = TRUE, otp = NULL, otp_expiry = NULL WHERE email = ?",
      [cleanEmail]
    );

    return res.status(200).json({
      success: true,
      message: "Email verified!",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification.",
    });
  }
}

export async function setPassword(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const user = users[0];
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email with OTP first.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query("UPDATE users SET password_hash = ? WHERE email = ?", [
      passwordHash,
      cleanEmail,
    ]);

    return res.status(200).json({
      success: true,
      message: "Account created successfully!",
    });
  } catch (error) {
    console.error("Set Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while setting password.",
    });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) 
    {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);
    if(users.length === 0) 
    {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const user = users[0];
    if(!user.is_verified || !user.password_hash) 
    {
      return res.status(403).json({
        success: false,
        message: "Account setup incomplete. Please sign up and verify OTP.",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }
    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    const hashedRefreshToken = hashToken(refreshToken);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()",
      [user.id]
    );
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, hashedRefreshToken, refreshExpiry]
    );
    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(24 * 60 * 60 * 1000)
    );
    res.cookie(
      "refreshToken",
      refreshToken,
      getCookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login." });
  }
}
export async function refreshAccessToken(req, res) {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing. Please login again.",
      });
    }

    const hashedIncoming = hashToken(incomingRefreshToken);

    const [rows] = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()",
      [hashedIncoming]
    );

    if (rows.length === 0) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(403).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, full_name: decoded.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie(
      "accessToken",
      newAccessToken,
      getCookieOptions(24 * 60 * 60 * 1000)
    );

    return res
      .status(200)
      .json({ success: true, message: "Access token refreshed" });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid refresh token. Please login again.",
    });
  }
}
export async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}
export async function logoutUser(req, res) {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (incomingRefreshToken) {
      const hashedIncoming = hashToken(incomingRefreshToken);
      await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [
        hashedIncoming,
      ]);
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error logging out" });
  }
}
