// register.js - simple client-side registration storing users in chrome.storage.local

const $ = (id) => document.getElementById(id);

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = $("name").value.trim();
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    const usersData = await chrome.storage.local.get(["users"]);
    const users = usersData.users || [];

    if (users.some((u) => u.email === email)) {
      alert("An account with that email already exists.");
      return;
    }

    const passwordHash = await sha256(password);

    users.push({ name, email, passwordHash });
    await chrome.storage.local.set({ users });

    // Auto-login after registration
    await chrome.storage.local.set({ currentUser: { name, email } });
    alert("Registered and signed in");
    window.close();
  });

document.getElementById("to-login").addEventListener("click", () => {
  window.location.href = "login.html";
});
