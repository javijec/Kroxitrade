export { }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Poe Trade Plus-BG] Received message:", request.query, request);

  if (request.query === "poe-ninja") {
    fetch(`https://poe.ninja/api${request.resource}`)
      .then(r => r.json())
      .then(response => {
        console.log("[Poe Trade Plus-BG] Poe-ninja response relative to:", request.resource, "SUCCESS:", !!response);
        sendResponse(response);
      })
      .catch((err) => {
        console.error("[Poe Trade Plus-BG] Poe-ninja fetch failed:", err);
        sendResponse(null);
      })
    return true
  }



})
