// login.js - authenticate against stored users

const $ = (id) => document.getElementById(id);

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  const data = await chrome.storage.local.get(["users"]);
  const users = data.users || [];

  const user = users.find((u) => u.email === email);
  if (!user) {
    alert("No account found for that email.");
    return;
  }

  const hash = await sha256(password);
  if (hash !== user.passwordHash) {
    alert("Incorrect password");
    return;
  }

  await chrome.storage.local.set({
    currentUser: { name: user.name, email: user.email },
  });
  alert("Signed in");
  window.close();
});

document.getElementById("to-register").addEventListener("click", () => {
  window.location.href = "register.html";
});
