"use client";

import { useState } from "react";

export default function ChatPreview() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const res = await fetch("https://my-chatbot-app-chi.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          businessId: "80d0026a-a372-4748-9c07-09bdac2b5d51", // or dynamic
          sessionId: "preview-session", // static for preview
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error contacting chatbot." },
      ]);
    }
  }

  return (
    <div className="w-full max-w-md border rounded-xl shadow bg-white">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-xl font-semibold">
        Chatbot Preview
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 border-t">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style="
            flex:1;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            font-size:14px;
            background:#ffffff;
            color:#000000;
          "
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
