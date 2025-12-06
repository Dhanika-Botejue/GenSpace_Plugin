document.getElementById("save").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SAVE_PAGE" });
});
