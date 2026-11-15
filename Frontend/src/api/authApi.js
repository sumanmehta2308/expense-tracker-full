const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(endpoint, options = {}) {
  const config = {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  };
  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (
    response.status === 401 &&
    !endpoint.includes("/auth/login") &&
    !endpoint.includes("/auth/refresh")
  ) {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export function initiateSignup(userData) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function verifyUserOtp(otpData) {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(otpData),
  });
}

export function setUserPassword(passwordData) {
  return apiRequest("/auth/set-password", {
    method: "POST",
    body: JSON.stringify(passwordData),
  });
}

export function loginUser(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser() {
  return apiRequest("/auth/me", { method: "GET" });
}

export function logoutUser() {
  return apiRequest("/auth/logout", { method: "POST" });
}
export function requestForgotPassword(email) {
  return apiRequest("/password/forgotpassword", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}