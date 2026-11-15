import { apiRequest } from "./authApi.js";
export function fetchLeaderboard() 
{
  return apiRequest("/premium/show-leaderboard", {
    method: "GET",
  });
}
