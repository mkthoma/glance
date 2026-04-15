import { clearCachedBriefings } from "../background/cache-manager";
import { clearApiKey, getApiKey, maskApiKey, saveApiKey } from "../background/key-manager";
import { getLoggedErrors } from "../background/logger";
import { DEFAULT_SETTINGS, MODEL_OPTIONS } from "../shared/constants";
import { getSettings, getUsageStats, saveSettings } from "../shared/storage";

function clampMaxWords(rawValue: string | undefined): number {
  const parsed = Number(rawValue ?? DEFAULT_SETTINGS.maxWords);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.maxWords;
  }

  return Math.min(Math.max(Math.round(parsed), 1000), 12000);
}

function setStatus(message: string, isError = false): void {
  const status = document.getElementById("status-message");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.style.color = isError ? "#f87171" : "#34d399";
}

async function hydrateApiKey(): Promise<void> {
  const maskNode = document.getElementById("api-key-mask");
  try {
    const apiKey = await getApiKey();
    if (maskNode) {
      maskNode.textContent = `Saved key: ${maskApiKey(apiKey)}`;
    }
  } catch {
    if (maskNode) {
      maskNode.textContent = "No API key saved yet.";
    }
  }
}

async function hydrateSettings(): Promise<void> {
  const settings = await getSettings();
  const modelSelect = document.getElementById("model-select") as HTMLSelectElement | null;
  const maxWordsInput = document.getElementById("max-words") as HTMLInputElement | null;
  const sidebarSide = document.getElementById("sidebar-side") as HTMLSelectElement | null;
  const caching = document.getElementById("enable-caching") as HTMLInputElement | null;
  const autoTranslate = document.getElementById("auto-translate") as HTMLInputElement | null;

  if (modelSelect) {
    modelSelect.replaceChildren();
    for (const model of MODEL_OPTIONS) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.label;
      modelSelect.append(option);
    }
    modelSelect.value = settings.selectedModel;
  }

  if (maxWordsInput) {
    maxWordsInput.value = String(settings.maxWords);
  }
  if (sidebarSide) {
    sidebarSide.value = settings.sidebarSide;
  }
  if (caching) {
    caching.checked = settings.enableCaching;
  }
  if (autoTranslate) {
    autoTranslate.checked = settings.autoTranslateToEnglish;
  }
}

async function hydrateStats(): Promise<void> {
  const stats = await getUsageStats();
  const errors = await getLoggedErrors();

  const totalBriefings = document.getElementById("metric-briefings");
  const totalInput = document.getElementById("metric-input");
  const totalErrors = document.getElementById("metric-errors");
  const errorLog = document.getElementById("error-log");

  if (totalBriefings) {
    totalBriefings.textContent = stats.totalBriefings.toLocaleString();
  }
  if (totalInput) {
    totalInput.textContent = stats.totalInputCharacters.toLocaleString();
  }
  if (totalErrors) {
    totalErrors.textContent = String(errors.length);
  }
  if (errorLog) {
    errorLog.replaceChildren();
    if (!errors.length) {
      const item = document.createElement("li");
      item.textContent = "No recent errors.";
      errorLog.append(item);
      return;
    }

    for (const error of errors.slice(0, 5)) {
      const item = document.createElement("li");
      const code = document.createElement("strong");
      code.textContent = error.code;
      item.append(code, ` - ${new Date(error.ts).toLocaleString()}`);
      errorLog.append(item);
    }
  }
}

document.getElementById("save-settings")?.addEventListener("click", async () => {
  const apiKeyInput = document.getElementById("api-key") as HTMLInputElement | null;
  const modelSelect = document.getElementById("model-select") as HTMLSelectElement | null;
  const maxWordsInput = document.getElementById("max-words") as HTMLInputElement | null;
  const sidebarSideSelect = document.getElementById("sidebar-side") as HTMLSelectElement | null;
  const enableCaching = document.getElementById("enable-caching") as HTMLInputElement | null;
  const autoTranslate = document.getElementById("auto-translate") as HTMLInputElement | null;

  try {
    const rawKey = apiKeyInput?.value.trim();
    if (rawKey && apiKeyInput) {
      await saveApiKey(rawKey);
      apiKeyInput.value = "";
    }

    await saveSettings({
      selectedModel: modelSelect?.value ?? DEFAULT_SETTINGS.selectedModel,
      maxWords: clampMaxWords(maxWordsInput?.value),
      sidebarSide: (sidebarSideSelect?.value ?? DEFAULT_SETTINGS.sidebarSide) as
        typeof DEFAULT_SETTINGS.sidebarSide,
      enableCaching: enableCaching?.checked ?? DEFAULT_SETTINGS.enableCaching,
      autoTranslateToEnglish:
        autoTranslate?.checked ?? DEFAULT_SETTINGS.autoTranslateToEnglish
    });

    await hydrateApiKey();
    await hydrateStats();
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not save settings.", true);
  }
});

document.getElementById("clear-cache")?.addEventListener("click", async () => {
  await clearCachedBriefings();
  setStatus("Cached briefings cleared.");
});

document.getElementById("clear-key")?.addEventListener("click", async () => {
  await clearApiKey();
  await hydrateApiKey();
  setStatus("Stored API key removed.");
});

void Promise.all([hydrateApiKey(), hydrateSettings(), hydrateStats()]);
