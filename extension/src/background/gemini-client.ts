import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  GEMINI_API_HOST,
  MODEL_OPTIONS
} from "../shared/constants";
import type {
  AskResponse,
  BriefingResponse,
  CredibilityScore,
  ExplainResponse,
  GlanceErrorCode,
  PageSnapshot,
  ReadingLevel,
  SelectionPayload,
  SentimentLabel,
  UserSettings
} from "../shared/types";

interface GeminiSuccessPayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GeminiFailure extends Error {
  code: GlanceErrorCode | string;
}

const BRIEFING_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    keyFacts: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    sentiment: {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        reason: { type: "STRING" }
      },
      required: ["label", "reason"]
    },
    credibility: {
      type: "OBJECT",
      properties: {
        score: { type: "STRING" },
        signals: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["score", "signals"]
    },
    questions: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    readingLevel: { type: "STRING" },
    sourceLanguage: { type: "STRING" },
    translatedFrom: {
      nullable: true,
      type: "STRING"
    }
  },
  required: [
    "summary",
    "keyFacts",
    "sentiment",
    "credibility",
    "questions",
    "readingLevel",
    "sourceLanguage",
    "translatedFrom"
  ]
};

function createError(code: GlanceErrorCode | string, message: string): GeminiFailure {
  const error = new Error(message) as GeminiFailure;
  error.code = code;
  return error;
}

function getModel(settings: UserSettings): string {
  const requested = settings.selectedModel || DEFAULT_MODEL;
  return MODEL_OPTIONS.some((model) => model.id === requested)
    ? requested
    : DEFAULT_MODEL;
}

function buildPrompt(snapshot: PageSnapshot, settings: UserSettings): string {
  return [
    "You are Glance, a page intelligence assistant.",
    "Return a concise intelligence briefing for the provided web page.",
    "Use only the supplied page content.",
    settings.autoTranslateToEnglish
      ? "If the source language is not English, translate your output to English and report the original language."
      : "Keep your output in the source page language.",
    "Return exactly 5 key facts and 3 smart follow-up questions.",
    "",
    `PAGE TITLE: ${snapshot.title}`,
    `PAGE URL: ${snapshot.url}`,
    `PAGE DOMAIN: ${snapshot.domain}`,
    "",
    "PAGE CONTENT:",
    snapshot.text
  ].join("\n");
}

function buildAskPrompt(snapshot: PageSnapshot, question: string): string {
  return [
    "Answer the user's question using only the supplied page content.",
    "If the page does not contain the answer, say: This page does not contain that information.",
    "",
    `PAGE TITLE: ${snapshot.title}`,
    `PAGE URL: ${snapshot.url}`,
    "",
    "PAGE CONTENT:",
    snapshot.text,
    "",
    `QUESTION: ${question}`
  ].join("\n");
}

function buildExplainPrompt(snapshot: PageSnapshot, selection: SelectionPayload): string {
  return [
    "Explain the selected text in plain English using the surrounding page context.",
    "Keep the answer under 5 short sentences.",
    "",
    `PAGE TITLE: ${snapshot.title}`,
    `PAGE URL: ${snapshot.url}`,
    "",
    `SELECTED TEXT: ${selection.selectedText}`,
    "",
    "SURROUNDING CONTEXT:",
    selection.contextText,
    "",
    "FULL PAGE CONTEXT:",
    snapshot.text
  ].join("\n");
}

function coerceSentimentLabel(value: string): SentimentLabel {
  if (value === "positive" || value === "negative" || value === "neutral" || value === "mixed") {
    return value;
  }

  return "neutral";
}

function coerceCredibilityScore(value: string): CredibilityScore {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

function coerceReadingLevel(value: string): ReadingLevel {
  if (value === "beginner" || value === "intermediate" || value === "expert") {
    return value;
  }

  return "intermediate";
}

async function callGemini({
  apiKey,
  prompt,
  model,
  schema
}: {
  apiKey: string;
  prompt: string;
  model: string;
  schema?: Record<string, unknown>;
}): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      signal: AbortSignal.timeout(30_000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Keep answers concise, factual, and grounded in the provided page."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: schema ? "application/json" : "text/plain",
          responseSchema: schema
        }
      })
    }
  );

  if (!response.ok) {
    await response.text();

    if (response.status === 401 || response.status === 403) {
      throw createError("INVALID_KEY", "Your Gemini API key was rejected.");
    }

    if (response.status === 404) {
      throw createError(
        "MODEL_UNAVAILABLE",
        "The selected Gemini model is unavailable. Choose another model in settings."
      );
    }

    if (response.status === 429) {
      throw createError("RATE_LIMITED", "Gemini rate limits are currently being hit.");
    }

    throw createError(
      "NETWORK_ERROR",
      `Gemini request failed with status ${response.status}.`
    );
  }

  const payload = (await response.json()) as GeminiSuccessPayload;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw createError("PARSE_ERROR", "Gemini returned an empty response.");
  }

  return text;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithResilience(options: {
  apiKey: string;
  prompt: string;
  model: string;
  schema?: Record<string, unknown>;
}): Promise<string> {
  const modelsToTry = [options.model];
  if (options.model !== FALLBACK_MODEL) {
    modelsToTry.push(FALLBACK_MODEL);
  }

  let lastError: GeminiFailure | null = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await callGemini({
          ...options,
          model
        });
      } catch (error) {
        const typedError = error as GeminiFailure;
        lastError = typedError;

        if (typedError.code === "RATE_LIMITED" && attempt === 0) {
          await sleep(1000);
          continue;
        }

        if (typedError.code === "MODEL_UNAVAILABLE") {
          break;
        }

        throw typedError;
      }
    }
  }

  throw lastError ?? createError("UNKNOWN_ERROR", "Gemini could not complete the request.");
}

function normalizeBriefing(rawJson: string): BriefingResponse {
  try {
    const parsed = JSON.parse(rawJson) as Partial<BriefingResponse>;

    if (
      !parsed.summary ||
      !Array.isArray(parsed.keyFacts) ||
      !Array.isArray(parsed.questions) ||
      !parsed.sentiment ||
      !parsed.sentiment.label ||
      !parsed.sentiment.reason ||
      !parsed.credibility ||
      !parsed.credibility.score ||
      !Array.isArray(parsed.credibility.signals) ||
      !parsed.readingLevel ||
      !parsed.sourceLanguage
    ) {
      throw createError(
        "PARSE_ERROR",
        "The briefing response did not match the expected structure."
      );
    }

    return {
      summary: parsed.summary,
      keyFacts: parsed.keyFacts.slice(0, 5),
      sentiment: {
        label: coerceSentimentLabel(parsed.sentiment.label),
        reason: parsed.sentiment.reason
      },
      credibility: {
        score: coerceCredibilityScore(parsed.credibility.score),
        signals: parsed.credibility.signals.slice(0, 5)
      },
      questions: parsed.questions.slice(0, 3),
      readingLevel: coerceReadingLevel(parsed.readingLevel),
      sourceLanguage: parsed.sourceLanguage,
      translatedFrom: parsed.translatedFrom ?? null
    };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    throw createError("PARSE_ERROR", "Glance could not parse the Gemini response.");
  }
}

export async function buildBriefing(
  snapshot: PageSnapshot,
  settings: UserSettings,
  apiKey: string
): Promise<BriefingResponse> {
  const text = await callGeminiWithResilience({
    apiKey,
    prompt: buildPrompt(snapshot, settings),
    model: getModel(settings),
    schema: BRIEFING_SCHEMA
  });

  return normalizeBriefing(text);
}

export async function askPageQuestion(
  snapshot: PageSnapshot,
  question: string,
  settings: UserSettings,
  apiKey: string
): Promise<AskResponse> {
  const answer = await callGeminiWithResilience({
    apiKey,
    prompt: buildAskPrompt(snapshot, question),
    model: getModel(settings)
  });

  return { answer };
}

export async function explainSelection(
  snapshot: PageSnapshot,
  selection: SelectionPayload,
  settings: UserSettings,
  apiKey: string
): Promise<ExplainResponse> {
  const explanation = await callGeminiWithResilience({
    apiKey,
    prompt: buildExplainPrompt(snapshot, selection),
    model: getModel(settings)
  });

  return { explanation };
}
