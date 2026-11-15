import "../utils/setup.js";
import { getCurrentUser, logoutUser } from "../api/authApi.js";
import {
  fetchExpenses,
  createExpense,
  removeExpense,
} from "../api/expenseApi.js";

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

let expensesList = [];

function showAlert(msg, type = "danger") {
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type} small py-2 px-3 mb-3`;
}

function setLoading(loading) {
  addBtn.disabled = loading;
  btnText.textContent = loading ? "Adding" : "Add";
  btnSpinner.classList.toggle("d-none", !loading);
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

function updateSummaryCards() {
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

function renderExpenses() {
  tableBody.innerHTML = "";
  updateSummaryCards();

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

async function initDashboard() {
  try {
    const authRes = await getCurrentUser();
    if (!authRes.success) {
      window.location.replace("/src/pages/login.html");
      return;
    }

    if (userGreeting) {
      const innerSpan = userGreeting.querySelector("span");
      if (innerSpan) {
        innerSpan.textContent = authRes.user.full_name;
      } else {
        userGreeting.textContent = `Hi, ${authRes.user.full_name}`;
      }
    }

    const expenseRes = await fetchExpenses();
    if (expenseRes.success) {
      expensesList = expenseRes.expenses;
      renderExpenses();
    }
  } catch (err) {
    console.error("Dashboard Init Error:", err);
    window.location.replace("/src/pages/login.html");
  }
}

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

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
      const addedExpense = res.expense || res.data;
      if (addedExpense) {
        expensesList.unshift(addedExpense);
        renderExpenses();
      } else {
        const refreshed = await fetchExpenses();
        if (refreshed.success) {
          expensesList = refreshed.expenses;
          renderExpenses();
        }
      }
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
      expensesList = expensesList.filter(
        (item) => String(item.id) !== String(expenseId)
      );
      renderExpenses();
    }
  } catch (err) {
    showAlert(err.message);
    deleteBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await logoutUser();
  } finally {
    localStorage.removeItem("user");
    window.location.replace("/src/pages/login.html");
  }
});

initDashboard();
