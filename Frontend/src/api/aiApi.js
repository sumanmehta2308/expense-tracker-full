import { apiRequest } from "./authApi.js";
export function suggestExpenseCategory(description) {
  return apiRequest("/ai/categorize", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}
export function fetchAiInsights() {
  return apiRequest("/ai/insights", {
    method: "GET",
  });
}
