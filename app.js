
// =====================================
// PAYORBIT - AUTHENTICATION + DASHBOARD
// =====================================

const state = {
  balance: 0,
  rewards: 0,
  transactions: [],
  withdrawals: [],
  commission: 5,
  fixedReward: 10,
  minimumWithdrawal: 100
};

let currentUser = null;
let supabaseClientInstance = window.supabase
  ? supabaseClient
  : null;

// Elements
const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authMessage = document.getElementById("authMessage");

// Currency formatter
function money(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Safe HTML
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Show login or dashboard
function showApp(isLoggedIn) {
  if (isLoggedIn) {
    document.body.classList.add("authenticated");
    authScreen.hidden = true;
  } else {
    document.body.classList.remove("authenticated");
    authScreen.hidden = false;
    currentUser = null;
  }
}

// Switch login/signup
document.getElementById("switchAuth").addEventListener("click", () => {
  const showingLogin = !loginForm.hidden;

  loginForm.hidden = showingLogin;
  signupForm.hidden = !showingLogin;

  document.getElementById("authTitle").textContent =
    showingLogin ? "Create Account" : "Welcome Back";

  document.getElementById("authSubtitle").textContent =
    showingLogin
      ? "Join PayOrbit today"
      : "Login to your PayOrbit account";

  document.getElementById("switchText").textContent =
    showingLogin
      ? "Already have an account?"
      : "Don't have an account?";

  document.getElementById("switchAuth").textContent =
    showingLogin ? "Login" : "Sign Up";

  authMessage.textContent = "";
});

// Signup
signupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  authMessage.textContent = "Creating your account...";

  const { data, error } = await supabaseClientInstance.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name
      }
    }
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  if (data.session) {
    authMessage.textContent = "Account created successfully!";
  } else {
    authMessage.textContent =
      "Account created! Please verify your email, then login.";
    signupForm.reset();
  }
});

// Login
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  authMessage.textContent = "Logging in...";

  const { error } =
    await supabaseClientInstance.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = "Login successful!";
});

// Load or create profile
async function loadProfile(user) {
  const fallbackName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  let displayName = fallbackName;

  const { data, error } = await supabaseClientInstance
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    displayName = data.display_name || fallbackName;
  } else if (!data) {
    const { error: insertError } = await supabaseClientInstance
      .from("profiles")
      .insert({
        id: user.id,
        display_name: fallbackName
      });

    if (insertError) {
      console.error("Profile creation:", insertError.message);
    }
  } else {
    console.error("Profile loading:", error.message);
  }

  document.getElementById("userDisplayName").textContent =
    displayName;

  document.getElementById("userEmailDisplay").textContent =
    user.email || "";

  document.getElementById("profileName").textContent =
    displayName;

  document.getElementById("profileEmail").textContent =
    user.email || "";
}

// Authentication state
function handleSession(session) {
  if (session?.user) {
    currentUser = session.user;
    showApp(true);
    loadProfile(session.user);
    updateDashboard();
  } else {
    showApp(false);
  }
}

// Listen for login/logout changes
supabaseClientInstance.auth.onAuthStateChange(
  (event, session) => {
    handleSession(session);
  }
);

// Check existing login
async function checkLogin() {
  const { data, error } =
    await supabaseClientInstance.auth.getSession();

  if (error) {
    authMessage.textContent = error.message;
    showApp(false);
    return;
  }

  handleSession(data.session);
}

// Logout
document.getElementById("logoutButton")
  .addEventListener("click", async () => {

    const { error } =
      await supabaseClientInstance.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    loginForm.reset();
    authMessage.textContent = "You have logged out.";
  });

// =====================================
// DEMO DASHBOARD
// =====================================

function updateDashboard() {
  document.getElementById("balance").textContent =
    money(state.balance);

  document.getElementById("rewards").textContent =
    money(state.rewards);

  document.getElementById("totalTransactions").textContent =
    state.transactions.length;

  renderTransactions();
  renderRecentActivity();
  renderWithdrawals();
}

function renderTransactions() {
  const container =
    document.getElementById("transactionList");

  if (!state.transactions.length) {
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

function renderRecentActivity() {
  const container =
    document.getElementById("recentActivity");

  if (!state.transactions.length) {
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

function renderWithdrawals() {
  const container =
    document.getElementById("withdrawalList");

  if (!state.withdrawals.length) {
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

// Demo withdrawal request
document.getElementById("withdrawalForm")
  .addEventListener("submit", event => {

    event.preventDefault();

    const amount = Number(
      document.getElementById("withdrawAmount").value
    );

    const method =
      document.getElementById("withdrawMethod").value;

    const message =
      document.getElementById("withdrawMessage");

    if (!Number.isFinite(amount) || amount <= 0) {
      message.textContent = "Enter a valid amount.";
      return;
    }

    if (amount < state.minimumWithdrawal) {
      message.textContent =
        "Minimum demo withdrawal is " +
        money(state.minimumWithdrawal);
      return;
    }

    if (amount > state.balance) {
      message.textContent = "Insufficient demo balance.";
      return;
    }

    state.withdrawals.unshift({
      amount,
      method,
      date: new Date().toLocaleString("en-IN")
    });

    message.textContent =
      "Demo request recorded. No real payment was made.";

    event.target.reset();
    updateDashboard();
  });

// Demo admin settings
document.getElementById("settingsForm")
  .addEventListener("submit", event => {

    event.preventDefault();

    const commission =
      Number(document.getElementById("commission").value);

    const fixedReward =
      Number(document.getElementById("fixedReward").value);

    const minimumWithdrawal =
      Number(document.getElementById("minimumWithdrawal").value);

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

    message.textContent = "Demo settings saved.";
  });

// Hide unfinished admin controls from normal users
const adminLink = document.querySelector('a[href="#admin"]');
const adminSection = document.getElementById("admin");

if (adminLink) adminLink.hidden = true;
if (adminSection) adminSection.hidden = true;

// Start application
showApp(false);
checkLogin();

console.log("PayOrbit authentication app loaded.");
