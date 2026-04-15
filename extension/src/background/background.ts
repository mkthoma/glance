import { getCachedBriefing, setCachedBriefing } from "./cache-manager";
import { askPageQuestion, buildBriefing, explainSelection } from "./gemini-client";
import { getApiKey } from "./key-manager";
import { logExtensionError, recordBriefingUsage } from "./logger";
import { getSettings } from "../shared/storage";
import type { RuntimeRequest, RuntimeResponse } from "../shared/types";

const CONTEXT_MENU_ID = "glance-explain-selection";
type ActiveTabCommand = { type: "GLANCE_TOGGLE_SIDEBAR" | "GLANCE_REQUEST_SELECTION" };

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Explain with Glance",
    contexts: ["selection"]
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === "toggle_sidebar") {
      await sendToActiveTab({ type: "GLANCE_TOGGLE_SIDEBAR" });
    }

    if (command === "explain_selection") {
      await sendToActiveTab({ type: "GLANCE_REQUEST_SELECTION" });
    }
  } catch {
    return;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
    return;
  }

  await sendToTab(tab.id, { type: "GLANCE_REQUEST_SELECTION" });
});

chrome.runtime.onMessage.addListener((message: RuntimeRequest, sender) => {
  return handleRuntimeMessage(message, sender.tab?.id).catch(
    (error: Error & { code?: string }) => {
      void logExtensionError({
        code: error.code ?? "UNKNOWN_ERROR",
        message: error.message
      });

      return {
        ok: false,
        error: {
          code: error.code ?? "UNKNOWN_ERROR",
          message: error.message
        }
      } satisfies RuntimeResponse;
    }
  );
});

async function handleRuntimeMessage(
  message: RuntimeRequest,
  _tabId?: number
): Promise<RuntimeResponse> {
  if (message.type === "GLANCE_BRIEF_PAGE") {
    const settings = await getSettings();
    if (settings.enableCaching) {
      const cached = await getCachedBriefing(message.payload.url);
      if (cached) {
        return { ok: true, data: cached.briefing, fromCache: true };
      }
    }

    const apiKey = await getApiKey();
    const briefing = await buildBriefing(message.payload, settings, apiKey);
    await recordBriefingUsage(message.payload.text.length);

    if (settings.enableCaching) {
      await setCachedBriefing(message.payload.url, briefing);
    }

    return { ok: true, data: briefing, fromCache: false };
  }

  if (message.type === "GLANCE_ASK_PAGE") {
    const settings = await getSettings();
    const apiKey = await getApiKey();
    const answer = await askPageQuestion(
      message.payload,
      message.payload.question,
      settings,
      apiKey
    );

    return { ok: true, data: answer };
  }

  if (message.type === "GLANCE_EXPLAIN_SELECTION") {
    const settings = await getSettings();
    const apiKey = await getApiKey();
    const explanation = await explainSelection(
      message.payload,
      message.payload.selection,
      settings,
      apiKey
    );

    return { ok: true, data: explanation };
  }

  if (message.type === "GLANCE_OPEN_OPTIONS") {
    await chrome.runtime.openOptionsPage();
    return { ok: true, data: null };
  }

  return {
    ok: true,
    data: null
  };
}

async function sendToActiveTab(message: ActiveTabCommand): Promise<void> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    return;
  }

  await sendToTab(tab.id, message);
}

async function sendToTab(tabId: number, message: ActiveTabCommand): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "The active tab is not available.";
    if (messageText.includes("Receiving end does not exist")) {
      return;
    }

    throw error;
  }
}
