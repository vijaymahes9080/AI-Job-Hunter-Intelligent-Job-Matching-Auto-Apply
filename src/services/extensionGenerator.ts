export function generateExtensionFiles() {
  const manifestJson = JSON.stringify(
    {
      manifest_version: 3,
      name: "AI Job Hunter Direct Scraper & Matcher",
      version: "1.0.0",
      description: "1-Click job posting scraper & real-time ATS match analyzer for LinkedIn, Indeed, Glassdoor, and Greenhouse.",
      permissions: ["activeTab", "scripting", "storage"],
      action: {
        default_popup: "popup.html",
        default_icon: "icon.png"
      },
      content_scripts: [
        {
          matches: [
            "*://*.linkedin.com/jobs/*",
            "*://*.indeed.com/*",
            "*://*.glassdoor.com/*",
            "*://*.greenhouse.io/*"
          ],
          js: ["content.js"]
        }
      ]
    },
    null,
    2
  );

  const contentJs = `// AI Job Hunter Manifest V3 Content Script
console.log("🚀 AI Job Hunter Scraper loaded on current page.");

function scrapeJobDetails() {
  let title = document.querySelector('h1')?.innerText || document.title;
  let company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, [data-company-name="true"]')?.innerText || "Target Company";
  let location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.innerText || "Remote";
  let description = document.querySelector('#job-details, .jobDescriptionText, .description')?.innerText || document.body.innerText.slice(0, 1000);

  return { title, company, location, description, url: window.location.href };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_JOB") {
    const jobData = scrapeJobDetails();
    sendResponse({ success: true, data: jobData });
  }
});
`;

  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Job Hunter</title>
  <style>
    body { font-family: system-ui, sans-serif; width: 300px; padding: 16px; background: #090d16; color: #f8fafc; margin: 0; }
    h2 { font-size: 16px; color: #818cf8; margin-top: 0; }
    p { font-size: 12px; color: #94a3b8; }
    button { width: 100%; background: linear-gradient(135deg, #6366f1, #a855f7); border: none; padding: 10px; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; }
    button:hover { opacity: 0.9; }
    .card { background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #334155; }
  </style>
</head>
<body>
  <h2>⚡ AI Job Hunter Scraper</h2>
  <div class="card">
    <p>Open any job page on LinkedIn or Indeed, then click below to import instantly into your workspace.</p>
  </div>
  <button id="scrapeBtn">Scrape & Sync to App</button>
  <script src="popup.js"></script>
</body>
</html>
`;

  const popupJs = `document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_JOB" }, (response) => {
    if (response && response.data) {
      alert("✅ Job Scraped Successfully!\\nTitle: " + response.data.title + "\\nCompany: " + response.data.company);
    } else {
      alert("❌ Could not scrape job from this page. Make sure you are on a supported job posting page.");
    }
  });
});
`;

  return { manifestJson, contentJs, popupHtml, popupJs };
}

export function downloadExtensionZip() {
  const { manifestJson, contentJs, popupHtml, popupJs } = generateExtensionFiles();
  const blob = new Blob(
    [
      `--- MANIFEST.JSON ---\n${manifestJson}\n\n--- CONTENT.JS ---\n${contentJs}\n\n--- POPUP.HTML ---\n${popupHtml}\n\n--- POPUP.JS ---\n${popupJs}`
    ],
    { type: 'text/plain;charset=utf-8' }
  );
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ai-job-hunter-chrome-extension-source.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
