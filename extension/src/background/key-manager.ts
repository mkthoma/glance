import { STORAGE_KEYS } from "../shared/constants";
import type { StorageShape } from "../shared/types";

export const KEY_REQUIRED_MESSAGE = "Add your Gemini API key in Glance settings.";
const GEMINI_API_KEY_REGEX = /^AIza[0-9A-Za-z_-]{35}$/;

function createKeyError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function validateApiKeyFormat(rawKey: string): boolean {
  return GEMINI_API_KEY_REGEX.test(rawKey.trim());
}

export function maskApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length < 8) {
    return "Saved";
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function saveApiKey(rawKey: string): Promise<string> {
  const apiKey = rawKey.trim();

  if (!validateApiKeyFormat(apiKey)) {
    throw createKeyError(
      "INVALID_KEY",
      "Gemini API keys should start with AIza and match the expected format."
    );
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.apiKey]: apiKey
  });

  return apiKey;
}

export async function getApiKey(): Promise<string> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.apiKey)) as StorageShape;
  const apiKey = result.glanceApiKey?.trim();

  if (!apiKey) {
    throw createKeyError("NO_KEY", KEY_REQUIRED_MESSAGE);
  }

  return apiKey;
}

export async function hasApiKey(): Promise<boolean> {
  try {
    await getApiKey();
    return true;
  } catch {
    return false;
  }
}

export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.apiKey);
}
