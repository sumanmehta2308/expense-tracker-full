import "../utils/setup.js";
import { validatePassword, doPasswordsMatch } from "../utils/validators.js";
import { setUserPassword } from "../api/authApi.js";

const verifiedEmailText = document.getElementById("verifiedEmailText");
const passwordForm = document.getElementById("password-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const togglePasswordBtn = document.getElementById("togglePassword");
const toggleIcon = document.getElementById("toggleIcon");
const alertBox = document.getElementById("alert-box");
const saveBtn = document.getElementById("saveBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

const signupEmail = sessionStorage.getItem("signupEmail");
const isOtpVerified = sessionStorage.getItem("otpVerified");

// Agar direct URL khola bina OTP verify kiye toh wapas signup par bhejo
if (!signupEmail || isOtpVerified !== "true") {
  window.location.replace("signup.html");
}

verifiedEmailText.textContent = signupEmail;

togglePasswordBtn.addEventListener("click", () => {
  const isPass = passwordInput.type === "password";
  passwordInput.type = isPass ? "text" : "password";
  toggleIcon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
});

function setFieldValidity(el, isValid) {
  el.classList.toggle("is-valid", isValid);
  el.classList.toggle("is-invalid", !isValid);
}

function showAlert(msg, type = "danger") {
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type} small`;
}

function setLoading(loading) {
  saveBtn.disabled = loading;
  btnText.textContent = loading
    ? "Saving Password..."
    : "Complete Registration";
  btnSpinner.classList.toggle("d-none", !loading);
}

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const isPassValid = validatePassword(password);
  const isConfirmValid = doPasswordsMatch(password, confirmPassword);

  setFieldValidity(passwordInput, isPassValid);
  setFieldValidity(confirmPasswordInput, isConfirmValid);

  if (!isPassValid || !isConfirmValid) return;

  try {
    setLoading(true);
    const res = await setUserPassword({ email: signupEmail, password });

   if (res.success) {
     sessionStorage.removeItem("signupEmail");
     sessionStorage.removeItem("signupFullName");
     sessionStorage.removeItem("otpVerified");
     window.location.href = "/src/pages/login.html";
   }
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});
