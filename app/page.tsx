"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Business = {
  id: number;
  name: string;
};

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  time: string;
};

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch businesses on load
  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name");

      if (data) {
        setBusinesses(data);
        setBusinessId(data[0]?.id || null); // default to first business
      }
    };

    fetchBusinesses();
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !businessId) return;
    setLoading(true);

    const userMsg: ChatMessage = {
      role: "user",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, businessId }),
    });

    const data = await res.json();

    const botMsg: ChatMessage = {
      role: "bot",
      text: data.reply,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChat((prev) => [...prev, botMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg flex flex-col h-[80vh]">
        
        {/* Business selector */}
        <div className="p-3 border-b flex items-center space-x-2">
          <label htmlFor="business" className="text-sm font-medium text-gray-700">
            Select Business:
          </label>
          <select
            id="business"
            value={businessId ?? ""}
            onChange={(e) => setBusinessId(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-gray-900"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.map((c, i) => (
            <div key={i} className={`flex ${c.role === "user" ? "justify-end" : "justify-start"} items-end`}>
              {c.role === "bot" && (
                <img
                  src="https://ui-avatars.com/api/?name=Bot&background=0D8ABC&color=fff"
                  alt="Bot"
                  className="w-8 h-8 rounded-full mr-2"
                />
              )}
              <div>
                <div
                  className={`px-4 py-2 rounded-2xl shadow-sm max-w-[75%] whitespace-pre-wrap ${
                    c.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {c.text}
                </div>
                <div className="text-xs text-gray-400 mt-1">{c.time}</div>
              </div>
              {c.role === "user" && (
                <img
                  src="https://ui-avatars.com/api/?name=You&background=6366F1&color=fff"
                  alt="User"
                  className="w-8 h-8 rounded-full ml-2"
                />
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-gray-500 text-sm italic">
              <span className="animate-pulse">Bot is typing...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t flex items-center space-x-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-400
                       bg-white text-gray-900 placeholder-gray-500 shadow-sm"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
