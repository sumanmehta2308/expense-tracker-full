import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
export async function sendOtpEmail(toEmail, fullName, otp) {
  // Terminal mein bhi print karenge taaki development mein aasani ho
  console.log(`\n[OTP SERVICE] Email: ${toEmail} | OTP: ${otp}\n`);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return;
  }
  const mailOptions = {
    from: `"Expense Tracker" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Verification OTP - Expense Tracker",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0d6efd;">Verify Your Email</h2>
        <p>Hi <strong>${fullName}</strong>,</p>
        <p>Use the following 6-digit OTP to verify your email address. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #6c757d; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}
