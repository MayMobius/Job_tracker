document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "download") {
    chrome.downloads.download({
      url: message.url,
      filename: "linkedin_applied_jobs.json"
    });
  }
});
