import { describe, expect, it } from "vitest";
import { isWebSearchConfigured, webSearchForModel } from "@/lib/web-search";

describe("webSearchForModel", () => {
  it("returns a clear message when Tavily is not configured", async () => {
    const prev = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;
    const out = await webSearchForModel("weather in Helsinki");
    expect(out.toLowerCase()).toContain("not configured");
    if (prev !== undefined) process.env.TAVILY_API_KEY = prev;
  });
});

describe("isWebSearchConfigured", () => {
  it("is false without API key", () => {
    const prev = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;
    expect(isWebSearchConfigured()).toBe(false);
    if (prev !== undefined) process.env.TAVILY_API_KEY = prev;
  });
});
