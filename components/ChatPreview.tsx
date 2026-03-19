"use client";

import { useEffect, useState } from "react";

type BusinessInfo = {
  title: string;
  welcome_message: string | null;
  system_prompt: string;
  bubble_icon: string;
  bubble_color: string;
  bubble_text_color: string;
  header_color: string;
  header_text_color: string;
  theme_primary: string;
  theme_secondary: string;
};

export default function ChatPreview() {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  // 1. Fetch business info for preview
  useEffect(() => {
    async function loadBusiness() {
      const res = await fetch(
        "https://my-chatbot-app-chi.vercel.app/api/business-info",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: "80d0026a-a372-4748-9c07-09bdac2b5d51",
          }),
        }
      );

      const data = await res.json();
      setBusiness(data);
    }

    loadBusiness();
  }, []);

  // 2. Inject welcome message once business info is loaded
  useEffect(() => {
    if (business?.welcome_message) {
      setMessages([
        {
          role: "assistant",
          content: business.welcome_message,
        },
      ]);
    }
  }, [business]);

  // 3. Send message logic
  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const res = await fetch(
        "https://my-chatbot-app-chi.vercel.app/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            businessId: "80d0026a-a372-4748-9c07-09bdac2b5d51",
            sessionId: "preview-session",
          }),
        }
      );

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error contacting chatbot." },
      ]);
    }
  }

  return (
    <div className="w-full max-w-md border rounded-xl shadow bg-white">
      {/* Header uses business theme */}
      <div
        className="px-4 py-3 rounded-t-xl font-semibold"
        style={{
          background: business?.header_color || "#1C64F2",
          color: business?.header_text_color || "#FFFFFF",
        }}
      >
        {business?.title || "Chatbot Preview"}
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className="px-3 py-2 rounded-lg max-w-[80%] text-sm"
              style={{
                background:
                  m.role === "user"
                    ? business?.theme_primary || "#1C64F2"
                    : "#e5e7eb",
                color: m.role === "user" ? "#fff" : "#111",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style={{
            background: "#ffffff",
            color: "#000000",
          }}
        />
        <button
          onClick={sendMessage}
          className="text-white px-4 py-2 rounded-lg text-sm"
          style={{
            background: business?.theme_primary || "#1C64F2",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
