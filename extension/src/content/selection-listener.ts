import { extractContextText } from "./readability-extractor";
import type { SelectionPayload } from "../shared/types";

export function getCurrentSelectionPayload(): SelectionPayload | null {
  const selection = window.getSelection();
  const selectedText = selection?.toString().replace(/\s+/g, " ").trim();

  if (!selectedText) {
    return null;
  }

  return {
    selectedText: selectedText.split(/\s+/).slice(0, 500).join(" "),
    contextText: extractContextText(selectedText) ?? selectedText
  };
}
