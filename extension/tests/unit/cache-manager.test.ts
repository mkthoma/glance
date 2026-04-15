import { describe, expect, it } from "vitest";
import {
  getCachedBriefing,
  setCachedBriefing,
  shouldUseCachedBriefing
} from "../../src/background/cache-manager";
import type { BriefingResponse } from "../../src/shared/types";

const briefing: BriefingResponse = {
  summary: "A concise overview of the article.",
  keyFacts: [
    "Fact one",
    "Fact two",
    "Fact three",
    "Fact four",
    "Fact five"
  ],
  sentiment: {
    label: "neutral",
    reason: "The page reports information without strong emotional language."
  },
  credibility: {
    score: "medium",
    signals: ["Lists sources", "Includes an author byline"]
  },
  questions: [
    "What evidence supports the main claim?",
    "Which sources are primary?",
    "What context is missing?"
  ],
  readingLevel: "intermediate",
  sourceLanguage: "English",
  translatedFrom: null
};

describe("cache-manager", () => {
  it("persists and retrieves a cached briefing", async () => {
    await setCachedBriefing("https://example.com/article", briefing);

    const cached = await getCachedBriefing("https://example.com/article");

    expect(cached?.briefing.summary).toBe(briefing.summary);
  });

  it("skips expired cache entries", async () => {
    await chrome.storage.local.set({
      glanceCache: {
        stale: {
          cacheKey: "stale",
          url: "https://example.com/old",
          createdAt: Date.now() - 1000 * 60 * 60,
          expiresAt: Date.now() - 1000,
          briefing
        }
      }
    });

    const cached = await getCachedBriefing("https://example.com/old");

    expect(cached).toBeNull();
  });

  it("exposes a simple freshness helper", () => {
    expect(
      shouldUseCachedBriefing({
        cacheKey: "fresh",
        url: "https://example.com/new",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        briefing
      })
    ).toBe(true);
  });
});
