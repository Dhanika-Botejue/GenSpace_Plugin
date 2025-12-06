chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "SAVE_PAGE") {
    // Ensure user is signed in
    const storage = await chrome.storage.local.get(["currentUser"]);
    const currentUser = storage.currentUser || null;
    if (!currentUser) {
      console.warn("SAVE_PAGE attempted without an authenticated user.");
      // Optionally notify the popup or show a warning
      return;
    }

    // 1. Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // 2. Ensure content script is injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // 3. Ask content script for HTML
    chrome.tabs.sendMessage(tab.id, { type: "GET_HTML" }, async (response) => {
      const html = response?.html ?? "";

      console.log("HTML length:", html.length);

      // 4. Send to API
      try {
        const headers = { "Content-Type": "application/json" };
        if (currentUser.token) {
          headers["Authorization"] = `Bearer ${currentUser.token}`;
        }

        await fetch("https://fastapi-production-62ec.up.railway.app/shares/", {
          method: "POST",
          headers,
          body: JSON.stringify({
            space_id: "59b99db4cfa9a34dcd7885b6",
            url: tab.url,
            content: html,
            // include user info to associate the share (server must accept)
            user: { name: currentUser.name, email: currentUser.email },
            // include user_id returned at login/registration
            user_id: currentUser.user_id || null,
          }),
        });

        console.log("Saved successfully");
      } catch (err) {
        console.error("Failed to upload HTML:", err);
      }
    });
  }
});
