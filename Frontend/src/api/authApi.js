const API_BASE_URL = import.meta.env.VITE_API_URL;

async function postRequest(endpoint, payload) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export function initiateSignup(userData) {
  return postRequest("/auth/signup", userData);
}

export function verifyUserOtp(otpData) {
  return postRequest("/auth/verify-otp", otpData);
}

export function setUserPassword(passwordData) {
  return postRequest("/auth/set-password", passwordData);
}

export function loginUser(credentials) {
  return postRequest("/auth/login", credentials);
}
