import "../utils/setup.js";
import { getCurrentUser, logoutUser } from "../api/authApi.js";
import {
  fetchExpenses,
  createExpense,
  removeExpense,
} from "../api/expenseApi.js";
import {
  createPremiumOrder,
  verifyPremiumTransaction,
} from "../api/purchaseApi.js";
import { fetchLeaderboard } from "../api/premiumApi.js";
import { suggestExpenseCategory, fetchAiInsights } from "../api/aiApi.js";
const userGreeting = document.getElementById("userGreeting");
const logoutBtn = document.getElementById("logoutBtn");
const expenseForm = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const alertBox = document.getElementById("alert-box");
const addBtn = document.getElementById("addBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const tableBody = document.getElementById("expense-table-body");
const emptyState = document.getElementById("emptyState");
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
const rowsPerPageSelect = document.getElementById("rowsPerPageSelect");
const paginationBar = document.getElementById("paginationBar");
const paginationInfo = document.getElementById("paginationInfo");
const pageIndicator = document.getElementById("pageIndicator");
const firstPageBtn = document.getElementById("firstPageBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const lastPageBtn = document.getElementById("lastPageBtn");

let expensesList = [];
let currentPage = 1;
let itemsPerPage = Number(localStorage.getItem("expenses_per_page")) || 10;
let totalPages = 1;
let totalItems = 0;

if (rowsPerPageSelect) {
  rowsPerPageSelect.value = String(itemsPerPage);
}

function showAlert(msg, type = "danger") {
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type} small py-2 px-3 mb-3`;
}

function setLoading(loading) {
  addBtn.disabled = loading;
  btnText.textContent = loading ? "Adding" : "Add";
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

function formatDate(dateString) {
  if (!dateString) return "Today";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function updateSummaryCards(summary) {
  if (summary) {
    totalAmountEl.textContent = `₹${Number(summary.totalSpent).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
    totalCountEl.textContent = summary.totalCount;
    topCategoryEl.textContent = summary.topCategory || "—";
    return;
  }

  const total = expensesList.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  totalAmountEl.textContent = `₹${total.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  totalCountEl.textContent = expensesList.length;

  if (expensesList.length === 0) {
    topCategoryEl.textContent = "—";
    return;
  }

  const categoryTotals = {};
  expensesList.forEach((item) => {
    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + Number(item.amount);
  });

  const highestCat = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
  topCategoryEl.textContent = highestCat;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderExpenses(summary) {
  tableBody.innerHTML = "";
  updateSummaryCards(summary);

  if (expensesList.length === 0) {
    emptyState.classList.remove("d-none");
    return;
  }

  emptyState.classList.add("d-none");

  expensesList.forEach((expense) => {
    const safeCategory = escapeHtml(expense.category);
    const tr = document.createElement("tr");
    tr.dataset.id = expense.id;
    tr.innerHTML = `
      <td class="fw-medium text-dark">${escapeHtml(expense.description)}</td>
      <td><span class="cat-badge cat-${safeCategory}">${safeCategory}</span></td>
      <td class="text-muted small">${formatDate(expense.created_at)}</td>
      <td class="text-end fw-semibold text-dark">₹${Number(
        expense.amount
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td class="text-end">
        <button type="button" class="btn-delete-row delete-btn" data-id="${
          expense.id
        }" title="Delete expense">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderPaginationControls() {
  if (!paginationBar) return;

  if (totalItems === 0) {
    paginationBar.classList.add("d-none");
    return;
  }

  paginationBar.classList.remove("d-none");
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  paginationInfo.textContent = `Showing ${startItem}–${endItem} of ${totalItems} expenses`;
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  firstPageBtn.disabled = currentPage <= 1;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  lastPageBtn.disabled = currentPage >= totalPages;
}

async function loadExpensesPage(page = 1) {
  try {
    const expenseRes = await fetchExpenses(page, itemsPerPage);
    if (expenseRes.success) {
      expensesList = expenseRes.expenses;
      currentPage = expenseRes.pagination.currentPage;
      totalPages = expenseRes.pagination.totalPages;
      totalItems = expenseRes.pagination.totalItems;

      if (currentPage > totalPages && totalPages >= 1) {
        return loadExpensesPage(totalPages);
      }

      renderExpenses(expenseRes.summary);
      renderPaginationControls();
    }
  } catch (err) {
    showAlert(err.message || "Failed to load expenses.");
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
    if (userGreeting) {
      const innerSpan = userGreeting.querySelector("span");
      if (innerSpan) {
        innerSpan.textContent = authRes.user.full_name;
      } else {
        userGreeting.textContent = `Hi, ${authRes.user.full_name}`;
      }
    }
    await loadExpensesPage(1);
  } catch (err) {
    console.error("Dashboard Init Error:", err);
    window.location.replace("/src/pages/login.html");
  }
}
if (rowsPerPageSelect) {
  rowsPerPageSelect.addEventListener("change", () => {
    itemsPerPage = Number(rowsPerPageSelect.value) || 10;
    localStorage.setItem("expenses_per_page", String(itemsPerPage));
    loadExpensesPage(1);
  });
}

if (firstPageBtn) {
  firstPageBtn.addEventListener("click", () => loadExpensesPage(1));
}
if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () =>
    loadExpensesPage(currentPage - 1)
  );
}
if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () =>
    loadExpensesPage(currentPage + 1)
  );
}
if (lastPageBtn) {
  lastPageBtn.addEventListener("click", () => loadExpensesPage(totalPages));
}

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

  if (!amount || Number(amount) <= 0 || description.length < 2 || !category) {
    showAlert(
      "Please enter a valid amount, description, and select a category."
    );
    return;
  }

  try {
    setLoading(true);
    const res = await createExpense({ amount, description, category });

    if (res.success) {
      await loadExpensesPage(1);
      expenseForm.reset();
      amountInput.focus();
    }
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});

tableBody.addEventListener("click", async (e) => {
  const deleteBtn = e.target.closest(".delete-btn");
  if (!deleteBtn) return;

  const expenseId = deleteBtn.dataset.id;
  deleteBtn.disabled = true;

  try {
    const res = await removeExpense(expenseId);
    if (res.success) {
      await loadExpensesPage(currentPage);
    }
  } catch (err) {
    showAlert(err.message);
    deleteBtn.disabled = false;
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
        alert("Transaction successful");
        showAlert(
          "Transaction successful! You are now a Premium User.",
          "success"
        );
        updatePremiumUI(true);
      }
    } catch (err) {
      alert("TRANSACTION FAILED");
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
        const rankClass = rank <= 3 ? `rank-${rank}` : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="rank-pill ${rankClass}">#${rank}</span></td>
          <td class="fw-medium text-dark">${escapeHtml(entry.name)}</td>
          <td class="text-end fw-semibold text-dark">₹${Number(
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
logoutBtn.addEventListener("click", async () => {
  try {
    await logoutUser();
  } finally {
    localStorage.removeItem("user");
    window.location.replace("/src/pages/login.html");
  }
});
initDashboard();
