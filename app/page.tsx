"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    setChat((prev) => [
      ...prev,
      { role: "user", text: message },
      { role: "bot", text: data.reply },
    ]);
    setMessage("");
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Chatbot</h1>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "1rem",
          height: "300px",
          overflowY: "auto",
          marginBottom: "1rem",
        }}
      >
        {chat.map((c, i) => (
          <p key={i}>
            <strong>{c.role}:</strong> {c.text}
          </p>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        style={{ width: "80%", marginRight: "1rem" }}
      />
      <button onClick={sendMessage}>Send</button>
    </main>
  );
}
