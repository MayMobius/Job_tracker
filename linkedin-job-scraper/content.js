(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const jobs = [];

  while (true) {
    // 1. 抓当前页的 10 条
    const list = document.querySelector('body > div.application-outlet > div.authentication-outlet > div > main > section > div > div:nth-child(4) > div > ul');
    if (!list) break;
    Array.from(list.children).forEach(card => {
      const a = Array.from(card.querySelectorAll('a[data-test-app-aware-link]'))
                  .find(x => x.innerText.trim());
      if (!a) return;
      const title = a.innerText.trim();
      const company = card.querySelector('div[class*="t-black"][class*="t-normal"]')?.innerText.trim() || '';
      const appliedAt = card.querySelector('span[class*="reusable-search-simple-insight__text"]')?.innerText.trim() || '';
      jobs.push({ title, company, appliedAt });
    });

    // 2. 找「下一页」按钮并点击
    const next = document.querySelector('button[aria-label="Next"]');
    if (!next || next.disabled) break;
    next.click();
    // 3. 等待页面加载完，视网络慢快适当加延时
    await sleep(2000);
  }

  // 4. 下载 JSON
  const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json' });
  const urlObj = URL.createObjectURL(blob);
  chrome.runtime.sendMessage({ type: 'download', url: urlObj });
})();
