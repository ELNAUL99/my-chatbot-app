import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const ALLOWED_ORIGIN = "https://allowed.example";

process.env.ALLOWED_ORIGINS = ALLOWED_ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

const supabaseClientMock = {
  from: vi.fn(() => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      single: vi.fn(async () => ({
        data: {
          title: "Shop bot",
          welcome_message: "Hi",
          bubble_icon: "💬",
          bubble_color: "#111111",
          bubble_text_color: "#ffffff",
          header_color: "#111111",
          header_text_color: "#ffffff",
          theme_primary: "#111111",
          theme_secondary: "#222222",
        },
        error: null,
      })),
    };
    return chain;
  }),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseClientMock),
}));

describe("business-info route", () => {
  it("blocks disallowed origins", async () => {
    const { POST } = await import("@/app/api/business-info/route");
    const req = new NextRequest("http://localhost/api/business-info", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ businessId: "232211d5-85e0-413d-8dec-b0c0ec281cca" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("validates request body", async () => {
    const { POST } = await import("@/app/api/business-info/route");
    const req = new NextRequest("http://localhost/api/business-info", {
      method: "POST",
      headers: { origin: ALLOWED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ businessId: "not-uuid" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid request payload." });
  });
});
