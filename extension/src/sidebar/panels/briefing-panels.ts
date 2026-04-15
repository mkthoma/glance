import { escapeHtml } from "../../shared/html";
import type { BriefingResponse } from "../../shared/types";

const ICON_TLDR = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2L4 9h4.5L5 14l7-8H8z"/></svg>`;

const ICON_FACTS = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 4h8M5 8h6M5 12h4"/><circle cx="2.5" cy="4" r=".5" fill="currentColor"/><circle cx="2.5" cy="8" r=".5" fill="currentColor"/><circle cx="2.5" cy="12" r=".5" fill="currentColor"/></svg>`;

const ICON_SENTIMENT = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M5.5 10c.6.9 2.6 1.3 5 0"/><circle cx="6" cy="7" r=".5" fill="currentColor"/><circle cx="10" cy="7" r=".5" fill="currentColor"/></svg>`;

const ICON_CREDIBILITY = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2l5 1.8v3.6c0 2.9-2.2 5-5 5.6C5.2 12.4 3 10.3 3 7.4V3.8z"/><path d="M5.5 8l1.5 1.5 3-3"/></svg>`;

const ICON_QUESTIONS = `<svg class="glance-panel-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6.2 6c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8c0 1-1 1.5-1.8 2"/><circle cx="8" cy="11.5" r=".6" fill="currentColor"/></svg>`;

function renderList(items: string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function safeBadgeTone(value: string, fallback: string): string {
  return /^[a-z-]+$/i.test(value) ? value : fallback;
}

export function renderBriefingPanels(briefing: BriefingResponse): string {
  const sentimentTone = safeBadgeTone(briefing.sentiment.label, "neutral");
  const credibilityTone = safeBadgeTone(briefing.credibility.score, "medium");

  return `
    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_TLDR}
          <h3>TL;DR</h3>
        </div>
      </div>
      <p>${escapeHtml(briefing.summary)}</p>
    </section>

    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_FACTS}
          <h3>Key Facts</h3>
        </div>
      </div>
      <ul class="glance-list">${renderList(briefing.keyFacts)}</ul>
    </section>

    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_SENTIMENT}
          <h3>Sentiment</h3>
        </div>
        <span class="glance-badge is-${sentimentTone}">${escapeHtml(briefing.sentiment.label)}</span>
      </div>
      <p>${escapeHtml(briefing.sentiment.reason)}</p>
    </section>

    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_CREDIBILITY}
          <h3>Credibility</h3>
        </div>
        <span class="glance-badge is-${credibilityTone}">${escapeHtml(briefing.credibility.score)}</span>
      </div>
      <ul class="glance-list">${renderList(briefing.credibility.signals)}</ul>
    </section>

    <section class="glance-panel">
      <div class="glance-panel-header">
        <div class="glance-panel-label">
          ${ICON_QUESTIONS}
          <h3>Smart Questions</h3>
        </div>
      </div>
      <ol class="glance-list glance-list-numbered">${renderList(briefing.questions)}</ol>
    </section>
  `;
}
