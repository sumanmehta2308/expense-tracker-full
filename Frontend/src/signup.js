import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

import {
  validateFullName,
  validateEmail,
  validatePassword,
  doPasswordsMatch,
} from "./utils/validators.js";
import { registerUser } from "./api/authApi.js";

// DOM Elements
const signupForm = document.getElementById("signup-form");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const togglePasswordBtn = document.getElementById("togglePassword");
const toggleIcon = document.getElementById("toggleIcon");

const alertBox = document.getElementById("alert-box");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

// 1. Show/Hide Password Toggle
togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  toggleIcon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
});

// Helper: Field Validation UI Toggle
function setFieldValidity(inputElement, isValid) {
  if (isValid) {
    inputElement.classList.remove("is-invalid");
    inputElement.classList.add("is-valid");
  } else {
    inputElement.classList.remove("is-valid");
    inputElement.classList.add("is-invalid");
  }
}

// Helper: Show Alert Message
function showAlert(message, type = "danger") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

// Helper: Loading Button State
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.textContent = isLoading
    ? "Creating Account..."
    : "Sign Up & Verify Email";
  btnSpinner.classList.toggle("d-none", !isLoading);
}

// 2. Form Submit Handler
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

  const fullName = fullNameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validate all inputs
  const isNameValid = validateFullName(fullName);
  const isEmailValid = validateEmail(email);
  const isPassValid = validatePassword(password);
  const isConfirmValid = doPasswordsMatch(password, confirmPassword);

  setFieldValidity(fullNameInput, isNameValid);
  setFieldValidity(emailInput, isEmailValid);
  setFieldValidity(passwordInput, isPassValid);
  setFieldValidity(confirmPasswordInput, isConfirmValid);

  if (!isNameValid || !isEmailValid || !isPassValid || !isConfirmValid) {
    return;
  }

  try {
    setLoading(true);
    const response = await registerUser({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
    });

    if (response.success) {
      showAlert(response.message, "success");
      // OTP page ke liye email temporarily sessionStorage mein save kar rahe hain
      sessionStorage.setItem("pendingVerificationEmail", response.email);

      setTimeout(() => {
        window.location.href = "verify-otp.html";
      }, 1500);
    }
  } catch (error) {
    showAlert(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});
