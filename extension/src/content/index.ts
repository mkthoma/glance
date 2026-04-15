import { extractPageSnapshot } from "./readability-extractor";
import { sendGlanceRequest } from "./message-broker";
import { getCurrentSelectionPayload } from "./selection-listener";
import { ensureSidebar, getSidebarController, removeSidebar } from "./sidebar-injector";
import { getSettings } from "../shared/storage";
import type {
  AskResponse,
  BriefingResponse,
  ExplainResponse,
  PageSnapshot
} from "../shared/types";

let lastSnapshot: PageSnapshot | null = null;

function getTooltipCoordinates(): { top: number; left: number } {
  const sidebar = getSidebarController();
  const root = sidebar?.root;
  if (!root) {
    return { top: 84, left: 16 };
  }

  const rect = root.getBoundingClientRect();
  return {
    top: rect.top + 84,
    left: rect.left + 16
  };
}

async function ensurePageSnapshot(): Promise<PageSnapshot> {
  const settings = await getSettings();
  lastSnapshot = await extractPageSnapshot(settings.maxWords);
  return lastSnapshot;
}

async function openSidebarAndBrief(): Promise<void> {
  const settings = await getSettings();
  const sidebar = ensureSidebar({
    side: settings.sidebarSide,
    onClose: () => removeSidebar(),
    onOpenSettings: () => {
      void chrome.runtime.sendMessage({ type: "GLANCE_OPEN_OPTIONS" });
    },
    onAsk: async (question) => {
      const snapshot = lastSnapshot ?? (await ensurePageSnapshot());
      sidebar.setAskPending(true);
      try {
        const response = await sendGlanceRequest({
          type: "GLANCE_ASK_PAGE",
          payload: {
            ...snapshot,
            question
          }
        });

        if (!response.ok) {
          sidebar.setAskAnswer(response.error.message);
          return;
        }

        if (!response.data || !("answer" in response.data)) {
          sidebar.setAskAnswer("Glance could not answer that question.");
          return;
        }

        const askResponse = response.data as AskResponse;
        sidebar.setAskAnswer(askResponse.answer);
      } catch (error) {
        sidebar.setAskAnswer(
          error instanceof Error ? error.message : "Glance could not answer that question."
        );
      } finally {
        sidebar.setAskPending(false);
      }
    }
  });

  sidebar.showLoading({
    domain: window.location.hostname
  });

  try {
    const snapshot = await ensurePageSnapshot();
    const response = await sendGlanceRequest({
      type: "GLANCE_BRIEF_PAGE",
      payload: snapshot
    });

    if (!response.ok) {
      const actionLabel =
        response.error.code === "NO_KEY" || response.error.code === "INVALID_KEY"
          ? "Open settings"
          : undefined;
      sidebar.showError(response.error.message, actionLabel, {
        domain: snapshot.domain
      });
      return;
    }

    if (!response.data || !("summary" in response.data)) {
      sidebar.showError("Glance returned an unexpected briefing shape.", undefined, {
        domain: snapshot.domain
      });
      return;
    }

    sidebar.showBriefing(response.data as BriefingResponse, {
      domain: snapshot.domain,
      fromCache: response.fromCache
    });
  } catch (error) {
    sidebar.showError(
      error instanceof Error ? error.message : "Glance could not analyze this page right now.",
      undefined,
      {
        domain: window.location.hostname
      }
    );
  }
}

async function explainCurrentSelection(): Promise<void> {
  const selection = getCurrentSelectionPayload();
  const sidebar = getSidebarController();
  const tooltipPosition = getTooltipCoordinates();

  if (!selection) {
    if (sidebar) {
      sidebar.showTooltip(
        "Select some text first, then try again.",
        tooltipPosition.top,
        tooltipPosition.left
      );
      window.setTimeout(() => sidebar.hideTooltip(), 2200);
    }
    return;
  }

  if (!sidebar) {
    await openSidebarAndBrief();
  }

  const snapshot = lastSnapshot ?? (await ensurePageSnapshot());
  const activeSidebar = getSidebarController();
  if (!activeSidebar) {
    return;
  }

  try {
    const response = await sendGlanceRequest({
      type: "GLANCE_EXPLAIN_SELECTION",
      payload: {
        ...snapshot,
        selection
      }
    });

    if (!response.ok) {
      activeSidebar.showTooltip(
        response.error.message,
        tooltipPosition.top,
        tooltipPosition.left
      );
      window.setTimeout(() => activeSidebar.hideTooltip(), 2600);
      return;
    }

    if (!response.data || !("explanation" in response.data)) {
      activeSidebar.showTooltip(
        "Glance could not explain that selection.",
        tooltipPosition.top,
        tooltipPosition.left
      );
      window.setTimeout(() => activeSidebar.hideTooltip(), 2600);
      return;
    }

    const explanation = response.data as ExplainResponse;
    activeSidebar.showTooltip(
      explanation.explanation,
      tooltipPosition.top,
      tooltipPosition.left
    );
    window.setTimeout(() => activeSidebar.hideTooltip(), 7000);
  } catch (error) {
    activeSidebar.showTooltip(
      error instanceof Error ? error.message : "Glance could not explain that selection.",
      tooltipPosition.top,
      tooltipPosition.left
    );
    window.setTimeout(() => activeSidebar.hideTooltip(), 2600);
  }
}

chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message.type === "GLANCE_TOGGLE_SIDEBAR") {
    if (getSidebarController()) {
      removeSidebar();
      return;
    }

    void openSidebarAndBrief();
  }

  if (message.type === "GLANCE_REQUEST_SELECTION") {
    void explainCurrentSelection();
  }
});
