import "../utils/setup.js";
import { validateEmail } from "../utils/validators.js";
import { loginUser } from "../api/authApi.js";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const toggleIcon = document.getElementById("toggleIcon");
const alertBox = document.getElementById("alert-box");
const loginBtn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

togglePasswordBtn.addEventListener("click", () => {
  const isPass = passwordInput.type === "password";
  passwordInput.type = isPass ? "text" : "password";
  toggleIcon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
});

function showAlert(msg, type = "danger") {
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type} small`;
}

function setLoading(loading) {
  loginBtn.disabled = loading;
  btnText.textContent = loading ? "Signing In..." : "Sign In";
  btnSpinner.classList.toggle("d-none", !loading);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

  const email = emailInput.value;
  const password = passwordInput.value;

  const isEmailValid = validateEmail(email);
  const isPassValid = password.trim().length > 0;

  emailInput.classList.toggle("is-invalid", !isEmailValid);
  passwordInput.classList.toggle("is-invalid", !isPassValid);

  if (!isEmailValid || !isPassValid) return;

  try {
    setLoading(true);
    const res = await loginUser({ email: email.trim(), password });
if (res.success) {
  sessionStorage.removeItem("signupEmail");
  sessionStorage.removeItem("signupFullName");
  sessionStorage.removeItem("otpVerified");
  window.location.href = "/src/pages/dashboard.html";
}
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});
