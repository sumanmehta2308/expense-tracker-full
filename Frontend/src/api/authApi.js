const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function registerUser(userData) {
  // Abhi frontend testing ke liye simulated response (jab backend banega tab real fetch chalega)
  console.log(
    "Sending signup payload to:",
    `${API_BASE_URL}/auth/signup`,
    userData
  );

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "OTP sent to your email! Redirecting to verification...",
        email: userData.email,
      });
    }, 800);
  });
}
