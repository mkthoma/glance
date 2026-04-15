export type SentimentLabel = "positive" | "negative" | "neutral" | "mixed";
export type CredibilityScore = "high" | "medium" | "low";
export type ReadingLevel = "beginner" | "intermediate" | "expert";
export type SidebarSide = "left" | "right";
export type GlanceErrorCode =
  | "NO_KEY"
  | "INVALID_KEY"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "NO_CONTENT"
  | "PARSE_ERROR"
  | "MODEL_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export interface BriefingResponse {
  summary: string;
  keyFacts: string[];
  sentiment: {
    label: SentimentLabel;
    reason: string;
  };
  credibility: {
    score: CredibilityScore;
    signals: string[];
  };
  questions: string[];
  readingLevel: ReadingLevel;
  sourceLanguage: string;
  translatedFrom: string | null;
}

export interface AskResponse {
  answer: string;
}

export interface ExplainResponse {
  explanation: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  domain: string;
  text: string;
  excerpt: string;
  selection?: SelectionPayload | null;
}

export interface SelectionPayload {
  selectedText: string;
  contextText: string;
}

export interface UserSettings {
  selectedModel: string;
  maxWords: number;
  sidebarSide: SidebarSide;
  enableCaching: boolean;
  autoTranslateToEnglish: boolean;
}

export interface CacheEntry {
  cacheKey: string;
  url: string;
  createdAt: number;
  expiresAt: number;
  briefing: BriefingResponse;
}

export interface LoggedError {
  ts: number;
  code: GlanceErrorCode | string;
  message: string;
  context?: Record<string, unknown>;
}

export interface UsageStats {
  totalBriefings: number;
  weekBriefings: number;
  weekBucket?: string;
  totalInputCharacters: number;
  errors: LoggedError[];
}

export interface StorageShape {
  glanceApiKey?: string;
  glanceSettings?: UserSettings;
  glanceCache?: Record<string, CacheEntry>;
  glanceStats?: UsageStats;
}

export type RuntimeRequest =
  | {
      type: "GLANCE_BRIEF_PAGE";
      payload: PageSnapshot;
    }
  | {
      type: "GLANCE_ASK_PAGE";
      payload: PageSnapshot & { question: string };
    }
  | {
      type: "GLANCE_EXPLAIN_SELECTION";
      payload: PageSnapshot & { selection: SelectionPayload };
    }
  | {
      type: "GLANCE_TOGGLE_SIDEBAR";
    }
  | {
      type: "GLANCE_REQUEST_SELECTION";
    }
  | {
      type: "GLANCE_OPEN_OPTIONS";
    };

export type RuntimeResponse =
  | {
      ok: true;
      data: BriefingResponse | AskResponse | ExplainResponse | SelectionPayload | null;
      fromCache?: boolean;
    }
  | {
      ok: false;
      error: {
        code: GlanceErrorCode | string;
        message: string;
      };
    };
