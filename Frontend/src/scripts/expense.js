import "../utils/setup.js";
import { getCurrentUser, logoutUser } from "../api/authApi.js";
import { fetchExpenses, removeExpense } from "../api/expenseApi.js";

const userGreeting = document.getElementById("userGreeting");
const logoutBtn = document.getElementById("logoutBtn");
const alertBox = document.getElementById("alert-box");
const tableBody = document.getElementById("expense-table-body");
const emptyState = document.getElementById("emptyState");

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
  alertBox.className = `alert alert-${type} py-2 px-3 mb-3 fw-semibold`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "Today";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderExpenses() {
  tableBody.innerHTML = "";

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
      <td class="text-muted small">${
        expense.note ? escapeHtml(expense.note) : "—"
      }</td>
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

      renderExpenses();
      renderPaginationControls();
    }
  } catch (err) {
    showAlert(err.message || "Failed to load expenses.");
  }
}

async function initExpensesPage() {
  try {
    const authRes = await getCurrentUser();
    if (!authRes.success) {
      window.location.replace("/src/pages/login.html");
      return;
    }

    if (userGreeting) {
      const innerSpan = userGreeting.querySelector("span");
      if (innerSpan) innerSpan.textContent = authRes.user.full_name;
    }

    await loadExpensesPage(1);
  } catch {
    window.location.replace("/src/pages/login.html");
  }
}

rowsPerPageSelect.addEventListener("change", () => {
  itemsPerPage = Number(rowsPerPageSelect.value) || 10;
  localStorage.setItem("expenses_per_page", String(itemsPerPage));
  loadExpensesPage(1);
});

firstPageBtn.addEventListener("click", () => loadExpensesPage(1));
prevPageBtn.addEventListener("click", () => loadExpensesPage(currentPage - 1));
nextPageBtn.addEventListener("click", () => loadExpensesPage(currentPage + 1));
lastPageBtn.addEventListener("click", () => loadExpensesPage(totalPages));

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

logoutBtn.addEventListener("click", async () => {
  try {
    await logoutUser();
  } finally {
    localStorage.removeItem("user");
    window.location.replace("/src/pages/login.html");
  }
});

initExpensesPage();
