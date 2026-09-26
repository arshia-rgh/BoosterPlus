import { expect, it } from "vitest";
import { APIError, errorMessage } from "../identity/api";
import { homeDiscoverySchema, legalSchema } from "./model";
import { parseContent } from "./validation";
it("turns invalid content into actionable field issues, never an outage", () => {
  try {
    parseContent(homeDiscoverySchema, {
      metrics: {
        window_days: 0,
        minimum_sample: 2,
        maximum_age_seconds: 90000,
      },
      introductions: ["boost", "accounts", "shop", "payment", "news"].map(
        (kind) => ({ kind, title: "", description: "" }),
      ),
    });
    throw new Error("Expected authoring errors");
  } catch (error) {
    expect(error).toBeInstanceOf(APIError);
    if (!(error instanceof APIError)) throw error;
    expect(errorMessage(error)).not.toMatch(/unavailable/i);
    expect(error.issues).toContainEqual({
      path: "introductions.0.title",
      message: "Enter a title.",
    });
    expect(error.issues).toContainEqual({
      path: "metrics.minimum_sample",
      message: "Enter a whole number from 5 to 1,000,000 records.",
    });
  }
  try {
    parseContent(legalSchema, {
      text: "Complete approved account terms.",
      sections: [{ kind: "privacy", title: "Privacy", text: "Too short" }],
    });
    throw new Error("Expected policy error");
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    expect(error.issues).toContainEqual({
      path: "sections.0.text",
      message: "Use at least 20 characters.",
    });
  }
});
