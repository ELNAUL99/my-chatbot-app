/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("widget behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.restoreAllMocks();

    Object.defineProperty(window, "CHATBOT_BUSINESS_ID", {
      configurable: true,
      value: "232211d5-85e0-413d-8dec-b0c0ec281cca",
    });

    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "session-123" },
      configurable: true,
    });
  });

  it("renders messages as text instead of HTML", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            title: "Bot",
            welcome_message: "Hi there",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            reply: "<img src=x onerror=alert('xss') />",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const script = readFileSync(resolve(process.cwd(), "public/widget.js"), "utf8");
    eval(script);

    const bubble = document.getElementById("chat-bubble");
    expect(bubble).not.toBeNull();
    bubble?.dispatchEvent(new MouseEvent("click"));

    const input = document.getElementById("chat-input") as HTMLInputElement;
    const sendButton = document.getElementById("chat-send");
    input.value = "hello";
    sendButton?.dispatchEvent(new MouseEvent("click"));

    for (let i = 0; i < 10; i += 1) {
      if (fetchMock.mock.calls.length >= 2) break;
      await new Promise((resolveTick) => setTimeout(resolveTick, 0));
    }
    await new Promise((resolveTick) => setTimeout(resolveTick, 0));

    const chatMessages = document.getElementById("chat-messages");
    expect(chatMessages?.textContent).toContain("<img src=x onerror=alert('xss') />");
    expect(chatMessages?.querySelector("img")).toBeNull();
    expect(chatMessages?.querySelector("script")).toBeNull();
  });
});
