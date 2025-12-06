chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_HTML") {
    const html = document.documentElement.outerHTML;
    sendResponse({ html });
  }

  // Returning true allows async response if needed
  return true;
});
