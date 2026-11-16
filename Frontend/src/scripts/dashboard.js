import "../utils/setup.js";
import { getCurrentUser, logoutUser } from "../api/authApi.js";
import { fetchExpenses, createExpense } from "../api/expenseApi.js";
import {
  createPremiumOrder,
  verifyPremiumTransaction,
} from "../api/purchaseApi.js";
import { fetchLeaderboard } from "../api/premiumApi.js";
import { suggestExpenseCategory, fetchAiInsights } from "../api/aiApi.js";

const userGreeting = document.getElementById("userGreeting");
const dropdownUserName = document.getElementById("dropdownUserName");
const logoutBtn = document.getElementById("logoutBtn");
const expenseForm = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");
const alertBox = document.getElementById("alert-box");
const addBtn = document.getElementById("addBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const totalAmountEl = document.getElementById("totalAmount");
const totalCountEl = document.getElementById("totalCount");
const topCategoryEl = document.getElementById("topCategory");

const buyPremiumBtn = document.getElementById("buyPremiumBtn");
const premiumBadge = document.getElementById("premiumBadge");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const openReportBtn = document.getElementById("openReportBtn");
const leaderboardSection = document.getElementById("leaderboardSection");
const leaderboardTableBody = document.getElementById("leaderboard-table-body");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");

const aiCategoryBadge = document.getElementById("aiCategoryBadge");
const getAiInsightsBtn = document.getElementById("getAiInsightsBtn");
const aiInsightsBox = document.getElementById("aiInsightsBox");

let alertTimer = null;

function showAlert(msg, type = "danger") {
  clearTimeout(alertTimer);
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type} py-2.5 px-3 mb-3 fw-semibold rounded-3`;
  if (type === "success") {
    alertTimer = setTimeout(() => {
      alertBox.classList.add("d-none");
    }, 3500);
  }
}

function setLoading(loading) {
  addBtn.disabled = loading;
  btnText.textContent = loading ? "Adding..." : "Add Expense";
  btnSpinner.classList.toggle("d-none", !loading);
}

function updatePremiumUI(isPremium) {
  if (!buyPremiumBtn || !premiumBadge) return;
  if (isPremium) {
    buyPremiumBtn.classList.add("d-none");
    premiumBadge.classList.remove("d-none");
    if (showLeaderboardBtn) showLeaderboardBtn.classList.remove("d-none");
    if (openReportBtn) {
      openReportBtn.disabled = false;
      openReportBtn.title = "Open Day to Day Expenses Report";
    }
  } else {
    buyPremiumBtn.classList.remove("d-none");
    premiumBadge.classList.add("d-none");
    if (showLeaderboardBtn) showLeaderboardBtn.classList.add("d-none");
    if (leaderboardSection) leaderboardSection.classList.add("d-none");
    if (openReportBtn) {
      openReportBtn.disabled = true;
      openReportBtn.title = "Available for Premium Users only";
    }
  }
}

function updateSummaryCards(summary) {
  if (!summary) return;
  totalAmountEl.textContent = `₹${Number(summary.totalSpent).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
  totalCountEl.textContent = summary.totalCount;
  topCategoryEl.textContent = summary.topCategory || "—";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function refreshSummary() {
  try {
    const res = await fetchExpenses(1, 1);
    if (res.success && res.summary) {
      updateSummaryCards(res.summary);
    }
  } catch (error) {
    console.error("Summary fetch error:", error);
  }
}

async function initDashboard() {
  try {
    const authRes = await getCurrentUser();
    if (!authRes.success) {
      window.location.replace("/src/pages/login.html");
      return;
    }

    updatePremiumUI(Boolean(authRes.user.is_premium));

    const fullName = authRes.user.full_name || "User";
    if (userGreeting) {
      const innerSpan = userGreeting.querySelector("span");
      if (innerSpan) {
        innerSpan.textContent = fullName;
      } else {
        userGreeting.textContent = fullName;
      }
    }
    if (dropdownUserName) {
      dropdownUserName.textContent = fullName;
    }

    await refreshSummary();
  } catch (error) {
    console.error("Dashboard Init Error:", error);
    window.location.replace("/src/pages/login.html");
  }
}

document
  .querySelectorAll('a[href="/src/pages/expense.html"]')
  .forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.assign("/src/pages/expense.html");
    });
  });

if (openReportBtn) {
  openReportBtn.addEventListener("click", () => {
    if (!openReportBtn.disabled) {
      window.open("/src/pages/report.html", "_blank");
    }
  });
}

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");
  if (aiCategoryBadge) aiCategoryBadge.classList.add("d-none");

  const amount = amountInput.value.trim();
  const description = descriptionInput.value.trim();
  const category = categoryInput.value;
  const note = noteInput ? noteInput.value.trim() : "";

  if (!amount || Number(amount) <= 0 || description.length < 2 || !category) {
    showAlert(
      "Please enter a valid amount, description, and select a category."
    );
    return;
  }

  try {
    setLoading(true);
    const res = await createExpense({ amount, description, category, note });

    if (res.success) {
      expenseForm.reset();
      amountInput.focus();
      showAlert("✅ Your data is added successfully!", "success");
      await refreshSummary();
    }
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});

if (buyPremiumBtn) {
  buyPremiumBtn.addEventListener("click", async () => {
    try {
      buyPremiumBtn.disabled = true;
      alertBox.classList.add("d-none");

      const orderRes = await createPremiumOrder();
      if (!orderRes.success) {
        showAlert("Could not initiate payment.", "danger");
        return;
      }

      const cashfree = window.Cashfree({ mode: "sandbox" });
      await cashfree.checkout({
        paymentSessionId: orderRes.payment_session_id,
        redirectTarget: "_modal",
      });

      const verifyRes = await verifyPremiumTransaction(orderRes.order_id);
      if (verifyRes.success) {
        showAlert(
          "Transaction successful! You are now a Premium User.",
          "success"
        );
        updatePremiumUI(true);
      }
    } catch (err) {
      showAlert(err.message || "TRANSACTION FAILED", "danger");
    } finally {
      buyPremiumBtn.disabled = false;
    }
  });
}

async function loadAndRenderLeaderboard() {
  try {
    showLeaderboardBtn.disabled = true;
    const res = await fetchLeaderboard();
    if (res.success && leaderboardTableBody) {
      leaderboardTableBody.innerHTML = "";
      res.leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="badge bg-dark rounded-pill px-2.5 py-1">#${rank}</span></td>
          <td class="fw-semibold text-dark">${escapeHtml(entry.name)}</td>
          <td class="text-end fw-bold text-dark">₹${Number(
            entry.total_expenses
          ).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
        `;
        leaderboardTableBody.appendChild(tr);
      });
      leaderboardSection.classList.remove("d-none");
      leaderboardSection.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    showAlert(err.message || "Failed to load leaderboard.", "danger");
  } finally {
    showLeaderboardBtn.disabled = false;
  }
}

if (showLeaderboardBtn) {
  showLeaderboardBtn.addEventListener("click", loadAndRenderLeaderboard);
}

if (closeLeaderboardBtn && leaderboardSection) {
  closeLeaderboardBtn.addEventListener("click", () => {
    leaderboardSection.classList.add("d-none");
  });
}

let aiTypingTimer = null;

function instantLocalCategory(text) {
  const t = text.toLowerCase();
  if (
    /\b(food|lunch|dinner|breakfast|domino|pizza|burger|swiggy|zomato|tea|coffee|chai|grocery|milk|snack|restaurant|cafe|biryani)\b/.test(
      t
    )
  )
    return "Food";
  if (
    /\b(petrol|diesel|fuel|pump|cng|indian oil|hp|bharat petroleum)\b/.test(t)
  )
    return "Fuel";
  if (
    /\b(amazon|flipkart|myntra|shirt|shoes|mall|clothes|shopping|jeans|watch)\b/.test(
      t
    )
  )
    return "Shopping";
  if (
    /\b(electricity|water|wifi|internet|recharge|bill|rent|gas|broadband|jio|airtel)\b/.test(
      t
    )
  )
    return "Bills";
  if (/\b(movie|netflix|pvr|inox|game|concert|spotify|prime|hotstar)\b/.test(t))
    return "Entertainment";
  if (
    /\b(uber|ola|rapido|flight|train|irctc|bus|metro|hotel|trip|cab|auto)\b/.test(
      t
    )
  )
    return "Travel";
  if (
    /\b(doctor|medicine|hospital|pharmacy|gym|medical|clinic|health|test)\b/.test(
      t
    )
  )
    return "Health";
  return null;
}

function applyCategoryOption(cat, labelText) {
  const optionExists = Array.from(categoryInput.options).some(
    (opt) => opt.value === cat
  );
  if (optionExists) {
    categoryInput.value = cat;
    if (aiCategoryBadge) {
      aiCategoryBadge.textContent = labelText;
      aiCategoryBadge.classList.remove("d-none");
    }
  }
}

if (descriptionInput && categoryInput) {
  descriptionInput.addEventListener("input", () => {
    clearTimeout(aiTypingTimer);
    const desc = descriptionInput.value.trim();

    if (desc.length < 3) {
      if (aiCategoryBadge) aiCategoryBadge.classList.add("d-none");
      return;
    }

    const instantMatch = instantLocalCategory(desc);
    if (instantMatch) {
      applyCategoryOption(instantMatch, `⚡ AI: ${instantMatch}`);
      return;
    }

    aiTypingTimer = setTimeout(async () => {
      try {
        if (aiCategoryBadge) {
          aiCategoryBadge.textContent = "🧠 AI...";
          aiCategoryBadge.classList.remove("d-none");
        }

        const res = await suggestExpenseCategory(desc);
        if (res.success && res.category) {
          applyCategoryOption(res.category, `✨ AI: ${res.category}`);
        }
      } catch {
        if (aiCategoryBadge) aiCategoryBadge.classList.add("d-none");
      }
    }, 200);
  });

  categoryInput.addEventListener("change", () => {
    if (aiCategoryBadge) aiCategoryBadge.classList.add("d-none");
  });
}

if (getAiInsightsBtn && aiInsightsBox) {
  getAiInsightsBtn.addEventListener("click", async () => {
    try {
      getAiInsightsBtn.disabled = true;
      getAiInsightsBtn.textContent = "Analyzing...";
      aiInsightsBox.textContent = "🧠 Gemini AI is reviewing your expenses...";
      aiInsightsBox.classList.remove("d-none");

      const res = await fetchAiInsights();
      if (res.success) {
        aiInsightsBox.textContent = res.insights;
      }
    } catch (err) {
      aiInsightsBox.textContent = err.message || "Unable to fetch AI insights.";
    } finally {
      getAiInsightsBtn.disabled = false;
      getAiInsightsBtn.textContent = "Analyze My Spending";
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem("user");
      window.location.replace("/src/pages/login.html");
    }
  });
}

initDashboard();
