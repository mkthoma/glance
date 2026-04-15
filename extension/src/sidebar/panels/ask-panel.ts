import { escapeHtml } from "../../shared/html";

const ICON_ASK = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v5.5a1 1 0 01-1 1H9l-3 2v-2H3a1 1 0 01-1-1z"/></svg>`;

export function renderAskPanel(answer = "", loading = false): string {
  return `
    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_ASK}
          <h3>Ask This Page</h3>
        </div>
      </div>
      <label class="glance-label" for="glance-ask-input">Your question</label>
      <textarea
        id="glance-ask-input"
        class="glance-textarea"
        rows="3"
        placeholder="Ask anything grounded in this page…"
        aria-label="Ask a question about this page"
      ></textarea>
      <div class="glance-actions">
        <button type="button" class="glance-primary-button" data-role="ask-submit" ${loading ? "disabled" : ""}>
          ${loading ? "Thinking…" : "Ask"}
        </button>
      </div>
      <div class="glance-answer ${answer ? "is-visible" : ""}" data-role="ask-answer" aria-live="polite">
        ${escapeHtml(answer || "Your grounded answer will appear here.")}
      </div>
    </section>
  `;
}
