const STORAGE_KEY = "smartExpenseTracker.transactions";
const BUDGET_KEY = "smartExpenseTracker.budget";

const form = document.querySelector("#transactionForm");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const dateInput = document.querySelector("#date");
const categoryInput = document.querySelector("#category");
const monthFilter = document.querySelector("#monthFilter");
const searchInput = document.querySelector("#searchInput");
const typeFilter = document.querySelector("#typeFilter");
const transactionList = document.querySelector("#transactionList");
const template = document.querySelector("#transactionTemplate");
const incomeTotal = document.querySelector("#incomeTotal");
const expenseTotal = document.querySelector("#expenseTotal");
const balanceTotal = document.querySelector("#balanceTotal");
const budgetUsed = document.querySelector("#budgetUsed");
const budgetInput = document.querySelector("#budgetInput");
const saveBudget = document.querySelector("#saveBudget");
const budgetProgress = document.querySelector("#budgetProgress");
const budgetStatus = document.querySelector("#budgetStatus");
const categoryChart = document.querySelector("#categoryChart");
const clearAll = document.querySelector("#clearAll");
const smartHintTitle = document.querySelector("#smartHintTitle");
const smartHintText = document.querySelector("#smartHintText");

const colors = {
  Food: "#237a63",
  Travel: "#3278b8",
  Bills: "#d79b24",
  Shopping: "#ee765d",
  Health: "#8d55bd",
  Entertainment: "#cc4f7a",
  Salary: "#145542",
  Other: "#65716d"
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedTransactions();
let budget = Number(localStorage.getItem(BUDGET_KEY)) || 2500;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedTransactions() {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);

  return [
    {
      id: createId(),
      description: "Monthly salary",
      amount: 5200,
      type: "income",
      category: "Salary",
      date: `${currentMonth}-01`
    },
    {
      id: createId(),
      description: "Apartment rent",
      amount: 1450,
      type: "expense",
      category: "Bills",
      date: `${currentMonth}-03`
    },
    {
      id: createId(),
      description: "Grocery run",
      amount: 168,
      type: "expense",
      category: "Food",
      date: `${currentMonth}-08`
    },
    {
      id: createId(),
      description: "Train pass",
      amount: 86,
      type: "expense",
      category: "Travel",
      date: `${currentMonth}-11`
    }
  ];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getSelectedMonth() {
  return monthFilter.value || new Date().toISOString().slice(0, 7);
}

function getVisibleTransactions() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const month = getSelectedMonth();

  return transactions
    .filter((item) => item.date.startsWith(month))
    .filter((item) => selectedType === "all" || item.type === selectedType)
    .filter((item) => {
      const searchable = `${item.description} ${item.category}`.toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getMonthTransactions() {
  const month = getSelectedMonth();
  return transactions.filter((item) => item.date.startsWith(month));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function renderList() {
  const visibleTransactions = getVisibleTransactions();
  transactionList.innerHTML = "";

  if (!visibleTransactions.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No matching transactions yet.";
    transactionList.append(empty);
    return;
  }

  visibleTransactions.forEach((transaction) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const amount = node.querySelector(".transaction-amount strong");

    node.querySelector(".item-description").textContent = transaction.description;
    node.querySelector(".item-meta").textContent = `${transaction.category} - ${formatDate(transaction.date)}`;
    node.querySelector(".category-dot").style.background = colors[transaction.category] || colors.Other;
    amount.textContent = `${transaction.type === "income" ? "+" : "-"}${currency.format(transaction.amount)}`;
    amount.className = transaction.type === "income" ? "income-text" : "expense-text";
    node.querySelector("button").addEventListener("click", () => deleteTransaction(transaction.id));

    transactionList.append(node);
  });
}

function renderSummary() {
  const monthTransactions = getMonthTransactions();
  const income = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;
  const budgetPercent = budget > 0 ? Math.round((expense / budget) * 100) : 0;

  incomeTotal.textContent = currency.format(income);
  expenseTotal.textContent = currency.format(expense);
  balanceTotal.textContent = currency.format(balance);
  budgetUsed.textContent = `${budgetPercent}%`;

  updateBudget(expense, budgetPercent);
  updateSmartHint(expense, income, budgetPercent);
}

function renderChart() {
  const expenseItems = getMonthTransactions().filter((item) => item.type === "expense");
  const totals = expenseItems.reduce((grouped, item) => {
    grouped[item.category] = (grouped[item.category] || 0) + item.amount;
    return grouped;
  }, {});
  const maxValue = Math.max(...Object.values(totals), 0);

  categoryChart.innerHTML = "";

  if (!expenseItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Expense categories will appear here.";
    categoryChart.append(empty);
    return;
  }

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const row = document.createElement("div");
      row.className = "category-row";
      row.innerHTML = `
        <span class="category-name"></span>
        <span class="category-track"><span class="category-fill"></span></span>
        <span class="category-amount"></span>
      `;

      row.querySelector(".category-name").textContent = category;
      row.querySelector(".category-fill").style.width = `${(amount / maxValue) * 100}%`;
      row.querySelector(".category-fill").style.background = colors[category] || colors.Other;
      row.querySelector(".category-amount").textContent = currency.format(amount);
      categoryChart.append(row);
    });
}

function updateBudget(expense, budgetPercent) {
  budgetInput.value = budget || "";
  budgetProgress.style.width = `${Math.min(budgetPercent, 100)}%`;
  budgetProgress.style.background = budgetPercent > 90 ? "#ee765d" : budgetPercent > 70 ? "#d79b24" : "#237a63";

  if (!budget) {
    budgetStatus.textContent = "Set a monthly budget to monitor spending.";
    return;
  }

  const remaining = budget - expense;
  budgetStatus.textContent = remaining >= 0
    ? `${currency.format(remaining)} left from your ${currency.format(budget)} monthly budget.`
    : `${currency.format(Math.abs(remaining))} over your ${currency.format(budget)} monthly budget.`;
}

function updateSmartHint(expense, income, budgetPercent) {
  if (expense === 0) {
    smartHintTitle.textContent = "Track every small spend.";
    smartHintText.textContent = "Add today's expenses to unlock spending insights.";
    return;
  }

  if (budgetPercent >= 100) {
    smartHintTitle.textContent = "Budget alert";
    smartHintText.textContent = "Your spending has passed the monthly limit. Review the largest categories first.";
    return;
  }

  if (income > 0 && expense / income < 0.4) {
    smartHintTitle.textContent = "Strong savings pace";
    smartHintText.textContent = "Expenses are below 40% of income this month. Keep the routine steady.";
    return;
  }

  smartHintTitle.textContent = "Watch the trend";
  smartHintText.textContent = "Your categories show where the next small adjustment can make room.";
}

function render() {
  renderSummary();
  renderChart();
  renderList();
}

function deleteTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  saveTransactions();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  transactions.push({
    id: createId(),
    description: descriptionInput.value.trim(),
    amount: Number(amountInput.value),
    type: new FormData(form).get("type"),
    category: categoryInput.value,
    date: dateInput.value
  });

  saveTransactions();
  form.reset();
  document.querySelector("#typeExpense").checked = true;
  dateInput.value = new Date().toISOString().slice(0, 10);
  render();
});

saveBudget.addEventListener("click", () => {
  budget = Number(budgetInput.value);
  localStorage.setItem(BUDGET_KEY, String(budget));
  render();
});

clearAll.addEventListener("click", () => {
  transactions = [];
  saveTransactions();
  render();
});

[monthFilter, searchInput, typeFilter].forEach((element) => {
  element.addEventListener("input", render);
});

monthFilter.value = new Date().toISOString().slice(0, 7);
dateInput.value = new Date().toISOString().slice(0, 10);
localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
render();
