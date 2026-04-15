import sidebarStyles from "./sidebar.css?inline";
import { renderAskPanel } from "./panels/ask-panel";
import { renderBriefingPanels } from "./panels/briefing-panels";
import { renderErrorState } from "./panels/error-state";
import { renderLoadingSkeleton } from "./panels/loading-skeleton";
import type { BriefingResponse } from "../shared/types";

export interface SidebarMeta {
  domain: string;
  readingLevel?: string;
  sourceLanguage?: string;
  translatedFrom?: string | null;
  fromCache?: boolean;
}

export interface SidebarController {
  root: HTMLElement;
  showLoading(meta: SidebarMeta): void;
  showBriefing(briefing: BriefingResponse, meta: SidebarMeta): void;
  showError(message: string, actionLabel?: string, meta?: SidebarMeta): void;
  setAskPending(pending: boolean): void;
  setAskAnswer(answer: string): void;
  showTooltip(message: string, top: number, left: number): void;
  hideTooltip(): void;
}

// ── SVG icon constants ──────────────────────────────────────────────────────

const ICON_GEAR = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 2h3l.6 1.8c.3.1.6.3.9.5l1.8-.6 1.5 2.6-1.3 1.3c0 .3.05.6 0 .8l1.3 1.3-1.5 2.6-1.8-.6c-.3.2-.6.4-.9.5L9.5 14h-3l-.6-1.8a4 4 0 01-.9-.5l-1.8.6-1.5-2.6 1.3-1.3a4 4 0 010-.8L1.7 6.3l1.5-2.6 1.8.6c.3-.2.6-.4.9-.5z"/><circle cx="8" cy="8" r="1.8"/></svg>`;

const ICON_MOON = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 10.5A6 6 0 015.5 2.5a5.5 5.5 0 100 11 6 6 0 008-3z"/></svg>`;

const ICON_SUN = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2.8"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"/></svg>`;

const ICON_CLOSE = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>`;

// ── Theme persistence ───────────────────────────────────────────────────────

const THEME_STORAGE_KEY = "glance_theme";

async function getSavedTheme(): Promise<"dark" | "light"> {
  try {
    const result = await chrome.storage.local.get(THEME_STORAGE_KEY);
    return result[THEME_STORAGE_KEY] === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

async function saveTheme(theme: "dark" | "light"): Promise<void> {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
  } catch {
    // non-critical
  }
}

function applyTheme(
  shell: HTMLElement,
  btn: HTMLButtonElement,
  theme: "dark" | "light"
): void {
  if (theme === "light") {
    shell.classList.add("is-light");
    btn.innerHTML = ICON_MOON;
    btn.title = "Switch to dark mode";
    btn.setAttribute("aria-label", "Switch to dark mode");
  } else {
    shell.classList.remove("is-light");
    btn.innerHTML = ICON_SUN;
    btn.title = "Switch to light mode";
    btn.setAttribute("aria-label", "Switch to light mode");
  }
}

// ── Sidebar factory ─────────────────────────────────────────────────────────

export function createSidebarController({
  shadowRoot,
  onClose,
  onOpenSettings,
  onAsk
}: {
  shadowRoot: ShadowRoot;
  onClose: () => void;
  onOpenSettings: () => void;
  onAsk: (question: string) => Promise<void>;
}): SidebarController {
  shadowRoot.innerHTML = `
    <style>${sidebarStyles}</style>
    <div class="glance-shell">
      <header class="glance-header">
        <div class="glance-brand">
          <div class="glance-brand-inner">
            <div class="glance-logo" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L4 9h4l-1 5 5-7H8z" fill="white" stroke="white" stroke-width="0.4" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="glance-brand-text">
              <h2>Glance</h2>
              <span class="glance-brand-sub">AI page intelligence</span>
            </div>
          </div>
          <div class="glance-header-actions">
            <button type="button" class="glance-icon-button" data-role="toggle-theme" title="Switch to light mode" aria-label="Switch to light mode">
              ${ICON_SUN}
            </button>
            <button type="button" class="glance-icon-button" data-role="open-settings" title="Open settings" aria-label="Open settings">
              ${ICON_GEAR}
            </button>
            <button type="button" class="glance-icon-button" data-role="close-sidebar" title="Close sidebar" aria-label="Close sidebar">
              ${ICON_CLOSE}
            </button>
          </div>
        </div>
        <div class="glance-meta" data-role="meta">Preparing your briefing...</div>
      </header>
      <main class="glance-body" data-role="body"></main>
    </div>
    <div class="glance-tooltip" data-role="tooltip" hidden></div>
  `;

  const shell = shadowRoot.querySelector<HTMLElement>(".glance-shell")!;
  const body = shadowRoot.querySelector<HTMLElement>("[data-role='body']")!;
  const meta = shadowRoot.querySelector<HTMLElement>("[data-role='meta']")!;
  const tooltip = shadowRoot.querySelector<HTMLElement>("[data-role='tooltip']")!;
  const themeBtn = shadowRoot.querySelector<HTMLButtonElement>("[data-role='toggle-theme']")!;

  if (!shell || !body || !meta || !tooltip) {
    throw new Error("Glance sidebar failed to mount.");
  }

  // Load and apply persisted theme
  void getSavedTheme().then((theme) => applyTheme(shell, themeBtn, theme));

  // Theme toggle handler
  themeBtn.addEventListener("click", async () => {
    const isLight = shell.classList.contains("is-light");
    const next: "dark" | "light" = isLight ? "dark" : "light";
    applyTheme(shell, themeBtn, next);
    await saveTheme(next);
  });

  shadowRoot
    .querySelector("[data-role='close-sidebar']")
    ?.addEventListener("click", onClose);
  shadowRoot
    .querySelector("[data-role='open-settings']")
    ?.addEventListener("click", onOpenSettings);

  const bindInteractiveHandlers = () => {
    shadowRoot
      .querySelector("[data-role='error-action']")
      ?.addEventListener("click", onOpenSettings);

    shadowRoot
      .querySelector("[data-role='ask-submit']")
      ?.addEventListener("click", async () => {
        const input = shadowRoot.querySelector<HTMLTextAreaElement>("#glance-ask-input");
        const question = input?.value.trim();

        if (!question) {
          return;
        }

        await onAsk(question);
      });
  };

  let currentMeta: SidebarMeta = {
    domain: "Preparing your briefing..."
  };

  const setMeta = (values: SidebarMeta) => {
    currentMeta = values;
    const details = [values.domain];
    if (values.readingLevel) {
      details.push(values.readingLevel);
    }
    if (values.translatedFrom) {
      details.push(`Translated from ${values.translatedFrom}`);
    } else if (values.sourceLanguage) {
      details.push(values.sourceLanguage);
    }
    if (values.fromCache) {
      details.push("cached");
    }

    meta.textContent = details.join(" • ");
  };

  const renderBody = (html: string) => {
    body.innerHTML = html + renderAskPanel();
    bindInteractiveHandlers();
  };

  return {
    root: shadowRoot.host as HTMLElement,
    showLoading(values) {
      setMeta(values);
      renderBody(renderLoadingSkeleton());
    },
    showBriefing(briefing, values) {
      setMeta({
        ...values,
        readingLevel: briefing.readingLevel,
        sourceLanguage: briefing.sourceLanguage,
        translatedFrom: briefing.translatedFrom
      });
      renderBody(renderBriefingPanels(briefing));
    },
    showError(message, actionLabel, values) {
      setMeta(
        values ?? {
          ...currentMeta,
          domain:
            actionLabel === "Open settings" ? "Settings required" : currentMeta.domain
        }
      );
      renderBody(renderErrorState(message, actionLabel));
    },
    setAskPending(pending) {
      const answer = shadowRoot.querySelector<HTMLElement>("[data-role='ask-answer']");
      const button = shadowRoot.querySelector<HTMLButtonElement>("[data-role='ask-submit']");
      if (button) {
        button.disabled = pending;
        button.textContent = pending ? "Thinking…" : "Ask";
      }
      if (answer && pending) {
        answer.classList.add("is-visible");
        answer.textContent = "Glance is reading the page...";
      }
    },
    setAskAnswer(answer) {
      const answerNode = shadowRoot.querySelector<HTMLElement>("[data-role='ask-answer']");
      if (!answerNode) {
        return;
      }

      answerNode.classList.add("is-visible");
      answerNode.textContent = answer;
    },
    showTooltip(message, top, left) {
      tooltip.hidden = false;
      tooltip.textContent = message;
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    },
    hideTooltip() {
      tooltip.hidden = true;
      tooltip.textContent = "";
    }
  };
}
