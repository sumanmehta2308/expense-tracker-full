import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { sendResetPasswordEmail } from "../utils/emailService.js";
export async function forgotPassword(req, res,next) {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [users] = await pool.query(
      "SELECT id, full_name, email FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }
    const user = users[0];
    const requestId = uuidv4();
    await pool.query(
      "UPDATE ForgotPasswordRequests SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE",
      [user.id]
    );

    await pool.query(
      "INSERT INTO ForgotPasswordRequests (id, user_id, is_active) VALUES (?, ?, TRUE)",
      [requestId, user.id]
    );
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${backendBaseUrl}/password/resetpassword/${requestId}`;

    console.log("Generated Password Reset URL:", resetUrl);
    sendResetPasswordEmail(user.email, user.full_name, resetUrl).catch(
      (error) => {
        console.error("Reset Email Send Error:", err.message);
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email!",
      resetUrl,
    });
  } catch (error) {
    return next(error);
  }
}
export async function getResetPasswordForm(req, res,next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM ForgotPasswordRequests WHERE id = ? AND is_active = TRUE",
      [id]
    );

    const loginPageUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/src/pages/login.html`;

    if (rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Link Expired - Expense Tracker</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
        </head>
        <body class="bg-light d-flex align-items-center justify-content-center vh-100">
          <div class="card shadow-sm p-4 text-center" style="max-width: 420px; border-radius: 12px;">
            <h4 class="text-danger fw-bold mb-2">Link Expired or Invalid</h4>
            <p class="text-muted small mb-3">This password reset link has already been used or does not exist.</p>
            <a href="${loginPageUrl}" class="btn btn-dark w-100">Back to Sign In</a>
          </div>
        </body>
        </html>
      `);
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Set New Password - Expense Tracker</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      </head>
      <body class="bg-light d-flex align-items-center justify-content-center vh-100">
        <div class="card shadow-sm p-4" style="width: 100%; max-width: 420px; border-radius: 12px;">
          <h4 class="fw-bold text-dark mb-1">Reset Password</h4>
          <p class="text-muted small mb-3">Enter a strong new password for your account.</p>

          <div id="statusBox" class="alert d-none small py-2"></div>

          <form id="resetForm">
            <div class="mb-3">
              <label for="newPassword" class="form-label small fw-semibold">New Password</label>
              <input type="password" id="newPassword" class="form-control" placeholder="Minimum 6 characters" required minlength="6" />
            </div>
            <div class="mb-3">
              <label for="confirmPassword" class="form-label small fw-semibold">Confirm Password</label>
              <input type="password" id="confirmPassword" class="form-control" placeholder="Re-enter new password" required minlength="6" />
            </div>
            <button type="submit" id="submitBtn" class="btn btn-dark w-100 fw-semibold">Update Password</button>
          </form>
        </div>

        <script>
          const form = document.getElementById("resetForm");
          const statusBox = document.getElementById("statusBox");
          const submitBtn = document.getElementById("submitBtn");

          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (newPassword !== confirmPassword) {
              statusBox.textContent = "Passwords do not match!";
              statusBox.className = "alert alert-danger small py-2";
              return;
            }

            try {
              submitBtn.disabled = true;
              submitBtn.textContent = "Updating...";

              const res = await fetch("/password/updatepassword/${id}", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
              });
              const data = await res.json();

              if (res.ok && data.success) {
                statusBox.textContent = "Password updated successfully! Redirecting to login...";
                statusBox.className = "alert alert-success small py-2";
                form.reset();
                setTimeout(() => {
                  window.location.href = "${loginPageUrl}";
                }, 1500);
              } else {
                statusBox.textContent = data.message || "Failed to update password.";
                statusBox.className = "alert alert-danger small py-2";
                submitBtn.disabled = false;
                submitBtn.textContent = "Update Password";
              }
            } catch (err) {
              statusBox.textContent = "Network error. Please try again.";
              statusBox.className = "alert alert-danger small py-2";
              submitBtn.disabled = false;
              submitBtn.textContent = "Update Password";
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    return next(error);
  }
}
export async function updatePassword(req, res,next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }
    const [requests] = await pool.query(
      "SELECT * FROM ForgotPasswordRequests WHERE id = ? AND is_active = TRUE",
      [id]
    );
    if (requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has already been used.",
      });
    }
    const resetRequest = requests[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await pool.query(
      "UPDATE users SET password_hash = ?, is_verified = TRUE WHERE id = ?",
      [passwordHash, resetRequest.user_id]
    );
    await pool.query(
      "UPDATE ForgotPasswordRequests SET is_active = FALSE WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (error) {
     return next(error);
  }
}
