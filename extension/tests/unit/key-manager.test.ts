import { describe, expect, it } from "vitest";
import {
  KEY_REQUIRED_MESSAGE,
  getApiKey,
  maskApiKey,
  saveApiKey,
  validateApiKeyFormat
} from "../../src/background/key-manager";

describe("key-manager", () => {
  it("accepts Gemini-style API keys", () => {
    expect(validateApiKeyFormat("AIza12345678901234567890123456789012345")).toBe(true);
  });

  it("rejects malformed API keys", () => {
    expect(validateApiKeyFormat("invalid-key")).toBe(false);
  });

  it("saves and reads the API key", async () => {
    const key = "AIza12345678901234567890123456789012345";

    await saveApiKey(key);

    await expect(getApiKey()).resolves.toBe(key);
  });

  it("throws a stable message when the key is missing", async () => {
    await expect(getApiKey()).rejects.toThrow(KEY_REQUIRED_MESSAGE);
  });

  it("masks the saved key for UI display", () => {
    expect(maskApiKey("AIza12345678901234567890123456789012345")).toBe(
      "AIza...2345"
    );
  });
});
