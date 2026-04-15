import { Readability, isProbablyReaderable } from "../../lib/readability";
import type { PageSnapshot } from "../shared/types";

function trimWords(text: string, maxWords: number): string {
  return text.split(/\s+/).slice(0, maxWords).join(" ").trim();
}

function getBodyFallbackText(maxWords: number): string {
  const rawText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
  return trimWords(rawText, maxWords);
}

function buildSnapshot(text: string): PageSnapshot {
  return {
    url: window.location.href,
    title: document.title || window.location.hostname,
    domain: window.location.hostname,
    text,
    excerpt: text.slice(0, 280)
  };
}

export async function extractPageSnapshot(maxWords: number): Promise<PageSnapshot> {
  const clonedDocument = document.cloneNode(true) as Document;
  const readable =
    typeof isProbablyReaderable === "function"
      ? isProbablyReaderable(clonedDocument)
      : true;

  let text = "";

  if (readable) {
    const article = new Readability(clonedDocument).parse();
    text = trimWords(article?.textContent?.replace(/\s+/g, " ").trim() ?? "", maxWords);
  }

  if (!text || text.split(/\s+/).length < 150) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    text = getBodyFallbackText(maxWords);
  }

  if (!text) {
    throw new Error("Not enough readable content was found on this page.");
  }

  return buildSnapshot(text);
}

export function extractContextText(
  selectedText: string,
  maxCharacters = 800
): string | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    return null;
  }

  const anchorElement = selection.anchorNode?.parentElement;
  const context = anchorElement?.textContent?.replace(/\s+/g, " ").trim();
  if (!context) {
    return selectedText;
  }

  return context.slice(0, maxCharacters);
}
