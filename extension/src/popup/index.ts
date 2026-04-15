import { hasApiKey } from "../background/key-manager";
import { getSettings } from "../shared/storage";

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab?.id ?? null;
}

async function refreshStatus(): Promise<void> {
  const status = document.getElementById("status");
  const dot = document.getElementById("status-dot");
  if (!status) {
    return;
  }

  const [apiKeyConfigured, settings] = await Promise.all([hasApiKey(), getSettings()]);

  if (apiKeyConfigured) {
    status.textContent = `Ready — using ${settings.selectedModel}.`;
    status.style.color = "#94a3b8";
    dot?.classList.add("is-ready");
  } else {
    status.textContent = "Add your Gemini API key in Settings to get started.";
    status.style.color = "#fbbf24";
    dot?.classList.add("is-error");
  }
}

document.getElementById("open-glance")?.addEventListener("click", async () => {
  const tabId = await getActiveTabId();
  if (!tabId) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "GLANCE_TOGGLE_SIDEBAR"
    });
  } catch {
    const status = document.getElementById("status");
    const dot = document.getElementById("status-dot");
    if (status) {
      status.textContent = "Glance is not available on this tab (try a regular webpage).";
      status.style.color = "#f87171";
    }
    dot?.classList.remove("is-ready");
    dot?.classList.add("is-error");
    return;
  }

  window.close();
});

document.getElementById("open-settings")?.addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
  window.close();
});

void refreshStatus();
