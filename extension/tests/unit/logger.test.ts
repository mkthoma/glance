import { describe, expect, it } from "vitest";
import { getLoggedErrors, logExtensionError } from "../../src/background/logger";

describe("logger", () => {
  it("stores a compact error record", async () => {
    await logExtensionError({
      code: "NETWORK_ERROR",
      message: "Unable to reach Gemini.",
      context: {
        url: "https://example.com/page"
      }
    });

    const errors = await getLoggedErrors();

    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("NETWORK_ERROR");
  });
});
