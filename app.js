
// =====================================
// PAYORBIT - SUPABASE AUTH + USER DATA
// =====================================

const state = {
  balance: 0,
  rewards: 0,
  transactions: [],
  withdrawals: [],
  minimumWithdrawal: 100
};

let currentUser = null;
let supabaseClientInstance =
  typeof supabaseClient !== "undefined"
    ? supabaseClient
    : null;

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authMessage = document.getElementById("authMessage");

// =====================================
// HELPERS
// =====================================

function money(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN");
}

function showMessage(element, message, isError = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#ff687b" : "#26d99a";
}

function showApp(isLoggedIn) {
  if (isLoggedIn) {
    document.body.classList.add("authenticated");
    authScreen.hidden = true;
  } else {
    document.body.classList.remove("authenticated");
    authScreen.hidden = false;
    currentUser = null;

    state.transactions = [];
    state.withdrawals = [];
    state.balance = 0;
    state.rewards = 0;

    updateDashboard();
  }
}

// =====================================
// CHECK SUPABASE CONNECTION
// =====================================

if (!supabaseClientInstance) {
  showMessage(
    authMessage,
    "Supabase connection missing. Please check supabase.js.",
    true
  );

  throw new Error("PayOrbit Supabase client not initialized.");
}

// =====================================
// SWITCH LOGIN / SIGNUP
// =====================================

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

  showMessage(authMessage, "");
});

// =====================================
// SIGNUP
// =====================================

signupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name) {
    showMessage(authMessage, "Please enter your name.", true);
    return;
  }

  showMessage(authMessage, "Creating your account...");

  try {
    const { data, error } =
      await supabaseClientInstance.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });

    if (error) throw error;

    if (data.session) {
      showMessage(authMessage, "Account created successfully!");
    } else {
      showMessage(
        authMessage,
        "Account created. Verify your email before logging in."
      );
      signupForm.reset();
    }

  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

// =====================================
// LOGIN
// =====================================

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  showMessage(authMessage, "Logging in...");

  try {
    const { error } =
      await supabaseClientInstance.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    showMessage(authMessage, "Login successful!");

  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

// =====================================
// LOAD USER PROFILE
// =====================================

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

  if (error) {
    console.error("Profile loading:", error.message);
  } else if (data) {
    displayName = data.display_name || fallbackName;
  } else {
    const { error: insertError } =
      await supabaseClientInstance
        .from("profiles")
        .insert({
          id: user.id,
          display_name: fallbackName
        });

    if (insertError) {
      console.error("Profile creation:", insertError.message);
    }
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

// =====================================
// LOAD PRIVATE USER DATA
// =====================================

async function loadUserData(user) {
  try {
    const { data: transactions, error: txError } =
      await supabaseClientInstance
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (txError) throw txError;

    const { data: withdrawals, error: wdError } =
      await supabaseClientInstance
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (wdError) throw wdError;

    if (currentUser?.id !== user.id) return;

    state.transactions = transactions || [];
    state.withdrawals = withdrawals || [];

    state.rewards = state.transactions
      .filter(tx => tx.type === "reward")
      .reduce((total, tx) => total + Number(tx.amount), 0);

    // No real-money balance is calculated from client-created records.
    state.balance = 0;

    updateDashboard();

  } catch (error) {
    console.error("User data loading:", error.message);

    showMessage(
      authMessage,
      "Could not load account history: " + error.message,
      true
    );
  }
}

// =====================================
// AUTHENTICATION STATE
// =====================================

async function handleSession(session) {
  if (!session?.user) {
    showApp(false);
    return;
  }

  const user = session.user;

  currentUser = user;
  showApp(true);

  await loadProfile(user);

  if (currentUser?.id !== user.id) return;

  await loadUserData(user);
}

// Listen for login and logout.
// setTimeout avoids doing database work inside the auth callback.

supabaseClientInstance.auth.onAuthStateChange(
  (event, session) => {
    setTimeout(() => {
      handleSession(session);
    }, 0);
  }
);

// Check existing login

async function checkLogin() {
  try {
    const { data, error } =
      await supabaseClientInstance.auth.getSession();

    if (error) throw error;

    await handleSession(data.session);

  } catch (error) {
    showMessage(authMessage, error.message, true);
    showApp(false);
  }
}

// =====================================
// LOGOUT
// =====================================

document.getElementById("logoutButton")
  .addEventListener("click", async () => {

    try {
      const { error } =
        await supabaseClientInstance.auth.signOut();

      if (error) throw error;

      loginForm.reset();
      showMessage(authMessage, "You have logged out.");

    } catch (error) {
      alert(error.message);
    }
  });

// =====================================
// DASHBOARD
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

// =====================================
// TRANSACTIONS
// =====================================

function renderTransactions() {
  const container = document.getElementById("transactionList");

  if (!state.transactions.length) {
    container.innerHTML =
      '<p class="empty-state">No transactions yet.</p>';
    return;
  }

  container.innerHTML = state.transactions.map(tx => {
    const isCredit = tx.type === "reward" || tx.type === "deposit";

    return `
      <div class="activity-item">
        <div>
          <strong>${escapeHTML(tx.type)}</strong>
          <small>${escapeHTML(formatDate(tx.created_at))}</small>
        </div>
        <div class="activity-amount ${isCredit ? "positive" : "negative"}">
          ${isCredit ? "+" : "-"}${money(tx.amount)}
        </div>
      </div>
    `;
  }).join("");
}

// =====================================
// RECENT ACTIVITY
// =====================================

function renderRecentActivity() {
  const container = document.getElementById("recentActivity");

  if (!state.transactions.length) {
    container.innerHTML =
      '<p class="empty-state">No activity available yet.</p>';
    return;
  }

  container.innerHTML = state.transactions.slice(0, 5).map(tx => {
    const isCredit = tx.type === "reward" || tx.type === "deposit";

    return `
      <div class="activity-item">
        <div>
          <strong>${escapeHTML(tx.type)}</strong>
          <small>${escapeHTML(formatDate(tx.created_at))}</small>
        </div>
        <div class="activity-amount ${isCredit ? "positive" : "negative"}">
          ${isCredit ? "+" : "-"}${money(tx.amount)}
        </div>
      </div>
    `;
  }).join("");
}

// =====================================
// WITHDRAWAL HISTORY
// =====================================

function renderWithdrawals() {
  const container = document.getElementById("withdrawalList");

  if (!state.withdrawals.length) {
    container.innerHTML =
      '<p class="empty-state">No withdrawal requests yet.</p>';
    return;
  }

  container.innerHTML = state.withdrawals.map(item => `
    <div class="activity-item">
      <div>
        <strong>${money(item.amount)}</strong>
        <small>
          ${escapeHTML(item.method)} ·
          ${escapeHTML(formatDate(item.created_at))}
        </small>
      </div>
      <span class="demo-label">
        ${escapeHTML(item.status.toUpperCase())}
      </span>
    </div>
  `).join("");
}

// =====================================
// SAVE DEMO WITHDRAWAL REQUEST
// =====================================

document.getElementById("withdrawalForm")
  .addEventListener("submit", async event => {

    event.preventDefault();

    const amount = Number(
      document.getElementById("withdrawAmount").value
    );

    const method =
      document.getElementById("withdrawMethod").value;

    const message =
      document.getElementById("withdrawMessage");

    if (!currentUser) {
      showMessage(message, "Please login first.", true);
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage(message, "Enter a valid amount.", true);
      return;
    }

    if (amount < state.minimumWithdrawal) {
      showMessage(
        message,
        "Minimum demo request is " + money(state.minimumWithdrawal),
        true
      );
      return;
    }

    showMessage(message, "Saving demo request...");

    try {
      const { error } = await supabaseClientInstance
        .from("withdrawal_requests")
        .insert({
          user_id: currentUser.id,
          amount,
          method,
          status: "pending"
        });

      if (error) throw error;

      event.target.reset();

      showMessage(
        message,
        "Demo request saved. No real payment was made."
      );

      await loadUserData(currentUser);

    } catch (error) {
      showMessage(message, error.message, true);
    }
  });

// =====================================
// DEMO ADMIN SETTINGS
// =====================================

const settingsForm = document.getElementById("settingsForm");

settingsForm.addEventListener("submit", event => {
  event.preventDefault();

  const minimumWithdrawal = Number(
    document.getElementById("minimumWithdrawal").value
  );

  const message = document.getElementById("settingsMessage");

  if (!Number.isFinite(minimumWithdrawal) || minimumWithdrawal < 1) {
    showMessage(message, "Enter a valid minimum amount.", true);
    return;
  }

  state.minimumWithdrawal = minimumWithdrawal;

  showMessage(message, "Local demo setting saved.");
});

// =====================================
// HIDE UNFINISHED ADMIN SECTION
// =====================================

const adminLink = document.querySelector('a[href="#admin"]');
const adminSection = document.getElementById("admin");

if (adminLink) adminLink.hidden = true;
if (adminSection) adminSection.hidden = true;

// =====================================
// START APPLICATION
// =====================================

showApp(false);
checkLogin();

console.log("PayOrbit app loaded.");
