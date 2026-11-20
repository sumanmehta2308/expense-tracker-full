import "../utils/setup.js";
import { getCurrentUser } from "../api/authApi.js";
import {
  fetchExpenses,
  downloadExpensesFile,
  fetchDownloadHistory,
} from "../api/expenseApi.js";

const reportTimestamp = document.getElementById("reportTimestamp");
const reportLedgerBody = document.getElementById("report-ledger-body");
const reportLedgerFooter = document.getElementById("report-ledger-footer");
const reportMonthlyBody = document.getElementById("report-monthly-body");
const reportNotesBody = document.getElementById("report-notes-body");
const reportIncomeForm = document.getElementById("reportIncomeForm");
const reportFilterBtns = document.querySelectorAll(".report-filter-btn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const s3LinkAlert = document.getElementById("s3LinkAlert");
const s3FileAnchor = document.getElementById("s3FileAnchor");
const downloadHistoryBody = document.getElementById("downloadHistoryBody");

let expensesList = [];
let currentReportFilter = "daily";
let localIncomesList = JSON.parse(
  localStorage.getItem("premium_incomes") || "[]"
);
let localNotesList = JSON.parse(localStorage.getItem("premium_notes") || "[]");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatLedgerDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function filterByTimeframe(items, filter) {
  const now = new Date();
  return items.filter((item) => {
    const itemDate = item.created_at ? new Date(item.created_at) : new Date();
    if (filter === "daily") {
      return itemDate.toDateString() === now.toDateString();
    }
    if (filter === "weekly") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }
    if (filter === "monthly") {
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });
}

function renderReportPage() {
  if (reportTimestamp) {
    reportTimestamp.textContent = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const combinedTransactions = [
    ...expensesList.map((e) => ({
      dateObj: e.created_at ? new Date(e.created_at) : new Date(),
      dateStr: formatLedgerDate(e.created_at),
      description: e.description,
      category: e.category,
      income: 0,
      expense: Number(e.amount),
    })),
    ...localIncomesList.map((inc) => ({
      dateObj: inc.created_at ? new Date(inc.created_at) : new Date(),
      dateStr: formatLedgerDate(inc.created_at),
      description: inc.description,
      category: "Salary / Income",
      income: Number(inc.amount),
      expense: 0,
    })),
  ];

  const filtered = filterByTimeframe(
    combinedTransactions.map((t) => ({ ...t, created_at: t.dateObj })),
    currentReportFilter
  ).sort((a, b) => b.dateObj - a.dateObj);

  reportLedgerBody.innerHTML = "";

  if (filtered.length === 0) {
    reportLedgerBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          No income or expense records found for the <strong>${currentReportFilter}</strong> view.
        </td>
      </tr>
    `;
  } else {
    const groupedByDate = {};
    filtered.forEach((row) => {
      if (!groupedByDate[row.dateStr]) groupedByDate[row.dateStr] = [];
      groupedByDate[row.dateStr].push(row);
    });

    Object.entries(groupedByDate).forEach(([dateStr, rows]) => {
      let dayIncome = 0;
      let dayExpense = 0;

      rows.forEach((r) => {
        dayIncome += r.income;
        dayExpense += r.expense;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${escapeHtml(r.description)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td class="text-end text-success">${
            r.income > 0
              ? r.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })
              : ""
          }</td>
          <td class="text-end text-danger">${
            r.expense > 0
              ? r.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })
              : ""
          }</td>
        `;
        reportLedgerBody.appendChild(tr);
      });

      const subTr = document.createElement("tr");
      subTr.className = "report-subtotal-row";
      subTr.innerHTML = `
        <td colspan="3" class="text-end text-muted small">Subtotal (${dateStr})</td>
        <td class="text-end text-success">₹${dayIncome.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}</td>
        <td class="text-end text-danger">₹${dayExpense.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}</td>
      `;
      reportLedgerBody.appendChild(subTr);
    });
  }

  const totalIncome = filtered.reduce((s, r) => s + r.income, 0);
  const totalExpense = filtered.reduce((s, r) => s + r.expense, 0);
  const netSavings = totalIncome - totalExpense;

  reportLedgerFooter.innerHTML = `
    <tr class="report-grandtotal-row">
      <td colspan="3" class="text-end">Total (${currentReportFilter.toUpperCase()})</td>
      <td class="text-end text-success">₹${totalIncome.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</td>
      <td class="text-end text-danger">₹${totalExpense.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</td>
    </tr>
    <tr class="table-light fw-bold">
      <td colspan="4" class="text-end">Savings</td>
      <td class="text-end ${netSavings >= 0 ? "text-primary" : "text-danger"}">
        ₹${netSavings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `;

  const currentMonthName = new Date().toLocaleString("en-IN", {
    month: "long",
  });
  const allMonthTxns = filterByTimeframe(
    combinedTransactions.map((t) => ({ ...t, created_at: t.dateObj })),
    "monthly"
  );
  const mInc = allMonthTxns.reduce((s, r) => s + r.income, 0);
  const mExp = allMonthTxns.reduce((s, r) => s + r.expense, 0);
  const mSav = mInc - mExp;

  reportMonthlyBody.innerHTML = `
    <tr>
      <td class="fw-semibold">${currentMonthName}</td>
      <td class="text-end text-success">₹${mInc.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</td>
      <td class="text-end text-danger">₹${mExp.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</td>
      <td class="text-end fw-bold">₹${mSav.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</td>
    </tr>
  `;

  if (localNotesList.length === 0) {
    reportNotesBody.innerHTML = `<tr><td colspan="2" class="text-muted text-center small py-2">No notes added yet.</td></tr>`;
  } else {
    reportNotesBody.innerHTML = localNotesList
      .map(
        (n) => `
        <tr>
          <td>${escapeHtml(n.date)}</td>
          <td>${escapeHtml(n.note)}</td>
        </tr>
      `
      )
      .join("");
  }
}

async function loadDownloadHistory() {
  if (!downloadHistoryBody) return;
  try {
    const res = await fetchDownloadHistory();
    if (res.success) {
      downloadHistoryBody.innerHTML =
        res.history && res.history.length > 0
          ? res.history
              .map(
                (item) => `
              <tr>
                <td class="fw-medium text-dark">${escapeHtml(
                  item.file_name
                )}</td>
                <td class="text-muted small">${new Date(
                  item.downloaded_at
                ).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</td>
                <td class="text-end">
                  <a href="${escapeHtml(
                    item.file_url
                  )}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary fw-semibold">
                    <i class="bi bi-download me-1"></i>Download Again
                  </a>
                </td>
              </tr>`
              )
              .join("")
          : `<tr><td colspan="3" class="text-center text-muted py-3">No files downloaded yet.</td></tr>`;
    }
  } catch (err) {
    downloadHistoryBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Unable to load download history.</td></tr>`;
  }
}

reportFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    reportFilterBtns.forEach((b) => {
      b.classList.remove("btn-dark", "active");
      b.classList.add("btn-outline-dark");
    });
    btn.classList.remove("btn-outline-dark");
    btn.classList.add("btn-dark", "active");
    currentReportFilter = btn.dataset.filter;
    renderReportPage();
  });
});

if (reportIncomeForm) {
  reportIncomeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amt = Number(document.getElementById("reportIncomeAmount").value);
    const desc = document.getElementById("reportIncomeDesc").value.trim();
    const note = document.getElementById("reportNoteText").value.trim();

    if (amt > 0 && desc) {
      localIncomesList.unshift({
        amount: amt,
        description: desc,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("premium_incomes", JSON.stringify(localIncomesList));
    }

    if (note) {
      localNotesList.unshift({
        date: formatLedgerDate(new Date()),
        note,
      });
      localStorage.setItem("premium_notes", JSON.stringify(localNotesList));
    }

    reportIncomeForm.reset();
    renderReportPage();
  });
}

if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener("click", async () => {
    const labelSpan = downloadCsvBtn.querySelector("span");
    try {
      downloadCsvBtn.disabled = true;
      if (labelSpan) labelSpan.textContent = "Uploading to S3...";

      const res = await downloadExpensesFile();
      if (res.success && res.fileUrl) {
        if (s3LinkAlert && s3FileAnchor) {
          s3FileAnchor.href = res.fileUrl;
          s3FileAnchor.textContent = res.fileUrl;
          s3LinkAlert.classList.remove("d-none");
        }

        window.open(res.fileUrl, "_blank");
        await loadDownloadHistory();
      }
    } catch (err) {
      alert(err.message || "Failed to generate S3 file.");
    } finally {
      downloadCsvBtn.disabled = false;
      if (labelSpan) labelSpan.textContent = "Download Expenses";
    }
  });
}

async function initReportPage() {
  try {
    const authRes = await getCurrentUser();
    if (!authRes.success) {
      window.location.replace("/src/pages/login.html");
      return;
    }
    if (!authRes.user.is_premium) {
      alert("This feature is only for Premium Users.");
      window.location.replace("/src/pages/dashboard.html");
      return;
    }

    const expRes = await fetchExpenses(1, 100);
    if (expRes.success) {
      expensesList = expRes.expenses;
    }
    renderReportPage();
    await loadDownloadHistory();
  } catch (err) {
    window.location.replace("/src/pages/dashboard.html");
  }
}

initReportPage();
