(function () {
  // -------------------------------
  // 1. Session ID
  // -------------------------------
  let sessionId = localStorage.getItem("chat_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("chat_session", sessionId);
  }

  // -------------------------------
  // 2. Business ID from embed snippet
  // -------------------------------
  const BUSINESS_ID = window.CHATBOT_BUSINESS_ID || "80d0026a-a372-4748-9c07-09bdac2b5d51";

  // -------------------------------
  // 3. Dynamic title + welcome message
  // -------------------------------
  let CHAT_TITLE = "Chat Assistant";
  let WELCOME_MESSAGE = "Hi! How can I help you today?";

  // Fetch business info (title + welcome message)
  (async () => {
    try {
      const res = await fetch("https://my-chatbot-app-chi.vercel.app/api/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: BUSINESS_ID })
      });

      const data = await res.json();

      if (data.title) CHAT_TITLE = data.title;
      if (data.welcome_message) WELCOME_MESSAGE = data.welcome_message;

      // Update header title after fetch
      const header = document.getElementById("chat-header");
      if (header) header.innerText = CHAT_TITLE;

    } catch (err) {
      console.warn("Failed to load business info");
    }
  })();

  // -------------------------------
  // 4. Create chat bubble
  // -------------------------------
  const bubble = document.createElement("div");
  bubble.id = "chat-bubble";
  bubble.innerHTML = "💬";
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    background: "#1C64F2",
    color: "#fff",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    zIndex: "999999",
    fontSize: "28px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "transform 0.2s ease"
  });

  bubble.onmouseenter = () => (bubble.style.transform = "scale(1.08)");
  bubble.onmouseleave = () => (bubble.style.transform = "scale(1)");

  document.body.appendChild(bubble);

  // -------------------------------
  // 5. Create chat window
  // -------------------------------
  const chatWindow = document.createElement("div");
  Object.assign(chatWindow.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "360px",
    height: "520px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    display: "none",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: "999999",
    opacity: "0",
    transform: "translateY(10px)",
    transition: "opacity 0.25s ease, transform 0.25s ease"
  });

  chatWindow.innerHTML = `
    <div id="chat-header" style="background:#1C64F2;color:#fff;padding:16px;font-size:18px;font-weight:bold;">
      ${CHAT_TITLE}
    </div>

    <div id="chat-messages" style="flex:1;padding:12px;overflow-y:auto;font-family:sans-serif;font-size:15px;line-height:1.4;">
    </div>

    <div style="padding:12px;border-top:1px solid #ddd;display:flex;gap:8px;">
      <input id="chat-input" type="text" placeholder="Type your message..."
        style="flex:1;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:14px;">
      <button id="chat-send"
        style="padding:10px 16px;background:#1C64F2;color:#fff;border:none;border-radius:8px;cursor:pointer;">
        Send
      </button>
    </div>
  `;

  document.body.appendChild(chatWindow);

  // -------------------------------
  // 6. Toggle chat window + welcome message
  // -------------------------------
  let hasShownWelcome = false;

  bubble.addEventListener("click", () => {
    const isOpening = chatWindow.style.display === "none";

    if (isOpening) {
      chatWindow.style.display = "flex";
      setTimeout(() => {
        chatWindow.style.opacity = "1";
        chatWindow.style.transform = "translateY(0)";
      }, 10);

      if (!hasShownWelcome) {
        addMessage("assistant", WELCOME_MESSAGE);
        hasShownWelcome = true;
      }
    } else {
      chatWindow.style.opacity = "0";
      chatWindow.style.transform = "translateY(10px)";
      setTimeout(() => (chatWindow.style.display = "none"), 200);
    }
  });

  // -------------------------------
  // 7. Add message to UI
  // -------------------------------
  function addMessage(role, text) {
    const messages = document.getElementById("chat-messages");
    const msg = document.createElement("div");
    msg.style.marginBottom = "12px";
    msg.style.whiteSpace = "pre-wrap";

    if (role === "user") {
      msg.style.textAlign = "right";
      msg.innerHTML = `<div style="display:inline-block;background:#1C64F2;color:#fff;padding:8px 12px;border-radius:12px;">${text}</div>`;
    } else {
      msg.style.textAlign = "left";
      msg.innerHTML = `<div style="display:inline-block;background:#f1f1f1;color:#333;padding:8px 12px;border-radius:12px;">${text}</div>`;
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  // -------------------------------
  // 8. Send message to backend
  // -------------------------------
  async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";

    try {
      const response = await fetch("https://my-chatbot-app-chi.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          businessId: BUSINESS_ID,
          sessionId: sessionId
        })
      });

      const data = await response.json();
      addMessage("assistant", data.reply);
    } catch (err) {
      addMessage("assistant", "Something went wrong.");
    }
  }

  document.getElementById("chat-send").addEventListener("click", sendMessage);
  document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
