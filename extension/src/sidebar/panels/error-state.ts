import { escapeHtml } from "../../shared/html";

const ICON_ERROR = `<svg class="glance-panel-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2L1.5 13h13z"/><path d="M8 6v3.5"/><circle cx="8" cy="11.5" r=".5" fill="currentColor"/></svg>`;

export function renderErrorState(message: string, actionLabel?: string): string {
  return `
    <section class="glance-panel glance-panel-error">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_ERROR}
          <h3>Needs attention</h3>
        </div>
      </div>
      <p>${escapeHtml(message)}</p>
      ${
        actionLabel
          ? `<div style="margin-top:12px;">
               <button type="button" class="glance-secondary-button" data-role="error-action">${escapeHtml(actionLabel)}</button>
             </div>`
          : ""
      }
    </section>
  `;
}
