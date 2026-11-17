
// PAYORBIT - DEMO APPLICATION

const state = {
  balance: 0,
  rewards: 0,
  transactions: [],
  withdrawals: [],
  commission: 5,
  fixedReward: 10,
  minimumWithdrawal: 100
};

// Currency formatter
function money(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Dashboard update
function updateDashboard() {
  document.getElementById("balance").textContent = money(state.balance);
  document.getElementById("rewards").textContent = money(state.rewards);
  document.getElementById("totalTransactions").textContent =
    state.transactions.length;

  renderTransactions();
  renderRecentActivity();
  renderWithdrawals();
}

// Transaction display
function renderTransactions() {
  const container = document.getElementById("transactionList");

  if (state.transactions.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No demo transactions yet.</p>';
    return;
  }

  container.innerHTML = state.transactions.map(tx => `
    <div class="activity-item">
      <div>
        <strong>${escapeHTML(tx.title)}</strong>
        <small>${escapeHTML(tx.date)}</small>
      </div>
      <div class="activity-amount ${tx.type === "credit" ? "positive" : "negative"}">
        ${tx.type === "credit" ? "+" : "-"}${money(tx.amount)}
      </div>
    </div>
  `).join("");
}

// Recent activity
function renderRecentActivity() {
  const container = document.getElementById("recentActivity");

  if (state.transactions.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No activity available yet.</p>';
    return;
  }

  container.innerHTML = state.transactions.slice(0, 5).map(tx => `
    <div class="activity-item">
      <div>
        <strong>${escapeHTML(tx.title)}</strong>
        <small>${escapeHTML(tx.date)}</small>
      </div>
      <div class="activity-amount ${tx.type === "credit" ? "positive" : "negative"}">
        ${tx.type === "credit" ? "+" : "-"}${money(tx.amount)}
      </div>
    </div>
  `).join("");
}

// Withdrawal display
function renderWithdrawals() {
  const container = document.getElementById("withdrawalList");

  if (state.withdrawals.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No withdrawal requests yet.</p>';
    return;
  }

  container.innerHTML = state.withdrawals.map(item => `
    <div class="activity-item">
      <div>
        <strong>${money(item.amount)}</strong>
        <small>${escapeHTML(item.method)} · ${escapeHTML(item.date)}</small>
      </div>
      <span class="demo-label">DEMO REQUEST</span>
    </div>
  `).join("");
}

// Basic text safety
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Demo withdrawal request
document.getElementById("withdrawalForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const amount = Number(
      document.getElementById("withdrawAmount").value
    );

    const method =
      document.getElementById("withdrawMethod").value;

    const message =
      document.getElementById("withdrawMessage");

    if (!Number.isFinite(amount) || amount <= 0) {
      message.textContent = "Please enter a valid amount.";
      return;
    }

    if (amount < state.minimumWithdrawal) {
      message.textContent =
        "Minimum demo withdrawal is " +
        money(state.minimumWithdrawal);
      return;
    }

    if (amount > state.balance) {
      message.textContent =
        "Insufficient demo balance.";
      return;
    }

    // This only records a local demonstration request.
    // It does not transfer or pay out real money.
    state.withdrawals.unshift({
      amount,
      method,
      date: new Date().toLocaleString("en-IN")
    });

    message.textContent =
      "Demo request recorded. No real payment was made.";

    this.reset();
    updateDashboard();
  });

// Admin demo settings
document.getElementById("settingsForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const commission = Number(
      document.getElementById("commission").value
    );

    const fixedReward = Number(
      document.getElementById("fixedReward").value
    );

    const minimumWithdrawal = Number(
      document.getElementById("minimumWithdrawal").value
    );

    const message =
      document.getElementById("settingsMessage");

    if (
      !Number.isFinite(commission) ||
      commission < 0 ||
      commission > 100 ||
      !Number.isFinite(fixedReward) ||
      fixedReward < 0 ||
      !Number.isFinite(minimumWithdrawal) ||
      minimumWithdrawal < 1
    ) {
      message.textContent = "Please enter valid settings.";
      return;
    }

    state.commission = commission;
    state.fixedReward = fixedReward;
    state.minimumWithdrawal = minimumWithdrawal;

    message.textContent =
      "Demo settings saved successfully.";
  });

// Demo environment notice
console.log("PayOrbit demo loaded successfully.");

// Initial dashboard
updateDashboard();
