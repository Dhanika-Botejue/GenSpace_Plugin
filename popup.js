// Auth-aware popup script with inline login/register that talk to remote API

const $ = (id) => document.getElementById(id);
const baseUrl = "https://fastapi-production-62ec.up.railway.app"; // provided base URL

function showView(view) {
  const views = ["main-view", "login-view", "register-view"];
  views.forEach((v) => {
    const el = $(v);
    if (!el) return;
    el.style.display = v === view ? "block" : "none";
  });
}

async function renderMain() {
  const data = await chrome.storage.local.get(["currentUser"]);
  const currentUser = data.currentUser || null;

  if (currentUser) {
    $("logged-in").style.display = "block";
    $("not-logged-in").style.display = "none";
    $("user-name").textContent = currentUser.name || "";
    $("user-email").textContent = currentUser.email || "";
  } else {
    $("logged-in").style.display = "none";
    $("not-logged-in").style.display = "block";
  }

  showView("main-view");
}

// Helpers
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch (e) {
    return null;
  }
}

function extractToken(data) {
  if (!data) return null;
  return (
    data.access_token ||
    data.token ||
    (data.data && (data.data.token || data.data.access_token)) ||
    null
  );
}

function extractUserId(data) {
  if (!data) return null;
  return (
    data.user_id ||
    data.userId ||
    data.id ||
    (data.user && (data.user.id || data.user.user_id)) ||
    (data.data && (data.data.user_id || data.data.id)) ||
    null
  );
}

function debounceButton(btn, timeout = 1000) {
  if (!btn) return;
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
  }, timeout);
}

// Wire UI buttons
document.addEventListener("DOMContentLoaded", () => {
  // navigation from main
  $("show-login").addEventListener("click", (e) => {
    debounceButton(e.target);
    showView("login-view");
  });
  $("show-register").addEventListener("click", (e) => {
    debounceButton(e.target);
    showView("register-view");
  });

  // navigation between auth views
  $("login-to-register").addEventListener("click", (e) => {
    debounceButton(e.target);
    showView("register-view");
  });
  $("register-to-login").addEventListener("click", (e) => {
    debounceButton(e.target);
    showView("login-view");
  });

  // logout
  $("logout").addEventListener("click", async (e) => {
    debounceButton(e.target);
    await chrome.storage.local.remove("currentUser");
    renderMain();
  });

  // save
  $("save").addEventListener("click", async (e) => {
    debounceButton(e.target);
    const data = await chrome.storage.local.get(["currentUser"]);
    if (!data.currentUser) {
      alert("Please log in before saving pages.");
      return;
    }
    chrome.runtime.sendMessage({ type: "SAVE_PAGE" });
  });

  // Register form
  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    debounceButton(submitBtn);

    const username = $("register-name").value.trim();
    const email = $("register-email").value.trim().toLowerCase();
    const password = $("register-password").value;

    if (!username || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const resp = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const body = await safeJson(resp);
      if (!resp.ok) {
        const msg =
          (body && (body.detail || body.message)) ||
          `Registration failed (status ${resp.status})`;
        alert(JSON.stringify(msg));
        console.warn("Registration failed:", body);
        return;
      }

      // Extract token and user_id if present; otherwise just set currentUser
      const token = extractToken(body) || null;
      const userId = extractUserId(body);
      await chrome.storage.local.set({
        currentUser: { name: username, email, token, user_id: userId },
      });
      alert("Registered and signed in");
      renderMain();
    } catch (err) {
      console.error(err);
      alert("Registration failed: " + err.message);
    }
  });

  // Login form
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    debounceButton(submitBtn);

    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      const resp = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await safeJson(resp);
      if (!resp.ok) {
        const msg =
          (body && (body.detail || body.message)) ||
          `Login failed (status ${resp.status})`;
        alert(msg);
        return;
      }

      const token = extractToken(body) || null;
      // try to get name from response, otherwise fall back to email
      const name =
        (body && body.user && body.user.name) || (body && body.name) || email;
      const userId = extractUserId(body);
      await chrome.storage.local.set({
        currentUser: { name, email, token, user_id: userId },
      });
      alert("Signed in");
      renderMain();
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  });

  // initial render
  renderMain();
});

// Re-render when storage changes (login/logout from other contexts)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.currentUser) {
    renderMain();
  }
});
