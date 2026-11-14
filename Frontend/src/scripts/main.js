import "../utils/setup.js";

const token = localStorage.getItem("authToken");

if (token) {
  window.location.replace("/src/pages/dashboard.html");
} else {
  window.location.replace("/src/pages/signup.html");
}
