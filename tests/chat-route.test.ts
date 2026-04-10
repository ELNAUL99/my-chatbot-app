import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ALLOWED_ORIGIN = "https://allowed.example";

process.env.ALLOWED_ORIGINS = ALLOWED_ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.GROQ_API_KEY = "groq-key";

const state = {
  messagesEqCalls: [] as Array<{ column: string; value: string }>,
};

const supabaseClientMock = {
  from: vi.fn((table: string) => {
    if (table === "businesses") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(async () => ({
          data: { system_prompt: "Be helpful", is_active: true, welcome_message: "Hi" },
          error: null,
        })),
      };
      return chain;
    }

    if (table === "messages") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: string) => {
          state.messagesEqCalls.push({ column, value });
          return chain;
        }),
        order: vi.fn(async () => ({
          data: [{ role: "assistant", content: "Previous message" }],
        })),
        insert: vi.fn(async () => ({ data: null, error: null })),
      };
      return chain;
    }

    throw new Error(`Unexpected table ${table}`);
  }),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseClientMock),
}));

describe("chat route", () => {
  beforeEach(() => {
    state.messagesEqCalls = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects disallowed origins", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({
        message: "Hello",
        businessId: "232211d5-85e0-413d-8dec-b0c0ec281cca",
        sessionId: "abc",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("validates payload with schema", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { origin: ALLOWED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({
        message: "",
        businessId: "bad-id",
        sessionId: "",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ reply: "Invalid request payload." });
  });

  it("applies tenant isolation when loading history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "Assistant reply" } }] }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const { POST } = await import("@/app/api/chat/route");
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { origin: ALLOWED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({
        message: "Hello",
        businessId: "232211d5-85e0-413d-8dec-b0c0ec281cca",
        sessionId: "same-session",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(state.messagesEqCalls).toContainEqual({
      column: "business_id",
      value: "232211d5-85e0-413d-8dec-b0c0ec281cca",
    });
  });

  it("streams NDJSON tokens when stream is true", async () => {
    // Disable web search for this test to ensure we test pure streaming
    const savedTavilyKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    try {
      const enc = new TextEncoder();
      const groqSse = new ReadableStream({
        start(controller) {
          controller.enqueue(
            enc.encode(
              'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'
            )
          );
          controller.enqueue(
            enc.encode('data: {"choices":[{"delta":{"content":"!"}}]}\n\n')
          );
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, opts?: { body?: string }) => {
          // For non-streaming requests (e.g., from runGroqWithWebSearch), return JSON
          if (opts?.body && !opts.body.includes('"stream":true')) {
            return new Response(
              JSON.stringify({
                choices: [{ message: { content: "Assistant reply" } }],
              }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          }
          // For streaming requests, return SSE
          return new Response(groqSse, { status: 200 });
        })
      );

      const { POST } = await import("@/app/api/chat/route");
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        headers: { origin: ALLOWED_ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({
          message: "Hi",
          businessId: "232211d5-85e0-413d-8dec-b0c0ec281cca",
          sessionId: "same-session",
          stream: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("ndjson");

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        out += dec.decode(value);
      }

      expect(out).toContain('"type":"token"');
      expect(out).toContain("Hello");
      expect(out).toContain('"type":"done"');
    } finally {
      // Restore TAVILY_API_KEY
      if (savedTavilyKey !== undefined) {
        process.env.TAVILY_API_KEY = savedTavilyKey;
      }
    }
  });
});
