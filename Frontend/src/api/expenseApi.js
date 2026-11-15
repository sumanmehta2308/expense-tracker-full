import { apiRequest } from "./authApi.js";

export function fetchExpenses() {
  return apiRequest("/expenses", { method: "GET" });
}

export function createExpense(expenseData) {
  return apiRequest("/expenses", {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
}

export function removeExpense(expenseId) {
  return apiRequest(`/expenses/${expenseId}`, {
    method: "DELETE",
  });
}
