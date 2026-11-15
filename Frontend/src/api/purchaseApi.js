import { apiRequest } from "./authApi.js";
export function createPremiumOrder() {
  return apiRequest("/purchase/premium-membership", {
    method: "POST",
  });
}
export function verifyPremiumTransaction(orderId) {
  return apiRequest("/purchase/update-transaction-status", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}
