import type { UserSettings } from "./types";

export const APP_NAME = "Glance";
export const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";
export const DEFAULT_MODEL = "gemini-2.5-flash";
export const FALLBACK_MODEL = "gemini-1.5-flash";
export const CACHE_TTL_MS = 1000 * 60 * 30;
export const MAX_CACHE_ENTRIES = 100;
export const MAX_ERROR_LOG_ENTRIES = 50;
export const DEFAULT_MAX_WORDS = 6000;

export const STORAGE_KEYS = {
  apiKey: "glanceApiKey",
  settings: "glanceSettings",
  cache: "glanceCache",
  stats: "glanceStats"
} as const;

export const MODEL_OPTIONS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash"
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite"
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash"
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash"
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro"
  }
] as const;

export const DEFAULT_SETTINGS: UserSettings = {
  selectedModel: DEFAULT_MODEL,
  maxWords: DEFAULT_MAX_WORDS,
  sidebarSide: "right",
  enableCaching: true,
  autoTranslateToEnglish: true
};

export const EMPTY_STATS = {
  totalBriefings: 0,
  weekBriefings: 0,
  weekBucket: "",
  totalInputCharacters: 0,
  errors: []
};
