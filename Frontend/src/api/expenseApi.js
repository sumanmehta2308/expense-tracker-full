import { apiRequest } from "./authApi.js";

export function fetchExpenses(page = 1, limit = 10) {
  return apiRequest(`/expenses?page=${page}&limit=${limit}`, {
    method: "GET",
  });
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
