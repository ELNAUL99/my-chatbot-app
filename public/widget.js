(function () {
  const API_ORIGIN =
    window.CHATBOT_API_ORIGIN || "https://my-chatbot-app-chi.vercel.app";

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
  const BUSINESS_ID = window.CHATBOT_BUSINESS_ID;
  if (!BUSINESS_ID) {
    console.error("Chatbot Error: Missing window.CHATBOT_BUSINESS_ID");
    return;
  }

  // -------------------------------
  // 3. Dynamic UI variables
  // -------------------------------
  let CHAT_TITLE = "Chat Assistant";
  let WELCOME_MESSAGE = null;

  let BUBBLE_ICON = "💬";
  let BUBBLE_COLOR = "#1C64F2";
  let BUBBLE_TEXT_COLOR = "#FFFFFF";

  let HEADER_COLOR = "#1C64F2";
  let HEADER_TEXT_COLOR = "#FFFFFF";

  let THEME_PRIMARY = "#1C64F2";
  let THEME_SECONDARY = "#0F3BB2";

  let hasShownWelcome = false;
  let isSending = false;
  let lastFailedUserText = null;
  let typingRow = null;
  let errorBanner = null;

  function injectWidgetStyles() {
    if (document.getElementById("sisu-widget-styles")) return;
    const s = document.createElement("style");
    s.id = "sisu-widget-styles";
    s.textContent = `
      @keyframes sisuTypingDot {
        0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-2px); }
      }
      .sisu-typing-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #888;
        margin: 0 2px;
        animation: sisuTypingDot 1.2s infinite ease-in-out both;
      }
      .sisu-typing-dot:nth-child(2) { animation-delay: 0.15s; }
      .sisu-typing-dot:nth-child(3) { animation-delay: 0.3s; }
    `;
    document.head.appendChild(s);
  }
  injectWidgetStyles();

  // -------------------------------
  // 4. Launcher bubble
  // -------------------------------
  const launcher = document.createElement("div");
  launcher.id = "chat-bubble";
  launcher.innerHTML = BUBBLE_ICON;

  Object.assign(launcher.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    background: BUBBLE_COLOR,
    color: BUBBLE_TEXT_COLOR,
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    zIndex: "1000001",
    fontSize: "26px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "transform 0.2s ease",
  });

  launcher.onmouseenter = () => (launcher.style.transform = "scale(1.06)");
  launcher.onmouseleave = () => (launcher.style.transform = "scale(1)");

  document.body.appendChild(launcher);

  // -------------------------------
  // 5. Chat window
  // -------------------------------
  const chatWindow = document.createElement("div");
  chatWindow.id = "chat-window";
  Object.assign(chatWindow.style, {
    position: "fixed",
    bottom: "88px",
    right: "16px",
    width: "360px",
    height: "min(520px, calc(100vh - 120px))",
    maxHeight: "calc(100vh - 120px)",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    display: "none",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: "1000000",
    opacity: "0",
    transform: "translateY(10px)",
    transition: "opacity 0.25s ease, transform 0.25s ease",
  });

  chatWindow.innerHTML = `
    <div id="chat-header" style="background:${HEADER_COLOR};color:${HEADER_TEXT_COLOR};padding:14px 16px;font-size:17px;font-weight:bold;flex-shrink:0;">
      ${CHAT_TITLE}
    </div>

    <div id="chat-messages" style="flex:1;padding:12px;overflow-y:auto;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.45;-webkit-overflow-scrolling:touch;">
    </div>

    <div id="chat-footer" style="flex-shrink:0;border-top:1px solid #e5e7eb;background:#fff;">
      <div style="padding:10px 12px;display:flex;gap:8px;align-items:center;">
        <input id="chat-input" type="text" enterkeyhint="send" autocomplete="off" placeholder="Type your message..."
          style="flex:1;min-width:0;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;">
        <button id="chat-send" type="button"
          style="flex-shrink:0;padding:10px 14px;background:${THEME_PRIMARY};color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">
          Send
        </button>
      </div>
      <div id="sisu-credit" style="text-align:center;font-size:11px;color:#999;padding:0 8px 10px;font-family:system-ui,sans-serif;opacity:0.85;">
        Powered by Sisu Assistant
      </div>
    </div>
  `;

  document.body.appendChild(chatWindow);

  function applyLayout() {
    const narrow = window.matchMedia("(max-width: 520px)").matches;
    const safeB = "max(12px, env(safe-area-inset-bottom, 0px))";
    const safeR = "max(12px, env(safe-area-inset-right, 0px))";

    if (narrow) {
      launcher.style.bottom = safeB;
      launcher.style.right = safeR;
      launcher.style.width = "52px";
      launcher.style.height = "52px";

      chatWindow.style.left = "0";
      chatWindow.style.right = "0";
      chatWindow.style.bottom = "0";
      chatWindow.style.width = "100%";
      chatWindow.style.maxWidth = "100%";
      chatWindow.style.height = "100%";
      chatWindow.style.maxHeight = "100dvh";
      chatWindow.style.borderRadius = "0";
      chatWindow.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
    } else {
      launcher.style.bottom = "20px";
      launcher.style.right = "20px";
      launcher.style.width = "56px";
      launcher.style.height = "56px";

      chatWindow.style.left = "";
      chatWindow.style.right = "16px";
      chatWindow.style.bottom = "88px";
      chatWindow.style.width = "360px";
      chatWindow.style.height = "min(520px, calc(100vh - 120px))";
      chatWindow.style.maxHeight = "calc(100vh - 120px)";
      chatWindow.style.borderRadius = "12px";
      chatWindow.style.paddingBottom = "0";
    }
  }

  applyLayout();
  window.addEventListener("resize", applyLayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyLayout);
  }

  function scrollMessagesToBottom() {
    const el = document.getElementById("chat-messages");
    if (el) el.scrollTop = el.scrollHeight;
  }

  function setSending(value) {
    isSending = value;
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");
    if (input) input.disabled = value;
    if (sendBtn) sendBtn.disabled = value;
    if (sendBtn) sendBtn.style.opacity = value ? "0.6" : "1";
  }

  function hideTyping() {
    if (typingRow && typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
    typingRow = null;
  }

  function showTyping() {
    hideTyping();
    const messages = document.getElementById("chat-messages");
    const row = document.createElement("div");
    row.setAttribute("aria-live", "polite");
    row.style.marginBottom = "12px";
    row.style.textAlign = "left";

    const label = document.createElement("span");
    label.style.fontSize = "13px";
    label.style.color = "#6b7280";
    label.style.marginRight = "6px";
    label.textContent = "Assistant is typing";

    row.appendChild(label);
    for (let i = 0; i < 3; i += 1) {
      const d = document.createElement("span");
      d.className = "sisu-typing-dot";
      row.appendChild(d);
    }

    messages.appendChild(row);
    typingRow = row;
    scrollMessagesToBottom();
  }

  function removeErrorBanner() {
    if (errorBanner && errorBanner.parentNode) {
      errorBanner.parentNode.removeChild(errorBanner);
    }
    errorBanner = null;
  }

  function showErrorWithRetry(userText, message) {
    lastFailedUserText = userText;
    removeErrorBanner();
    const footer = document.getElementById("chat-footer");
    const wrap = document.createElement("div");
    wrap.id = "chat-error-banner";
    Object.assign(wrap.style, {
      padding: "10px 12px",
      background: "#fef2f2",
      borderTop: "1px solid #fecaca",
      fontSize: "13px",
      color: "#991b1b",
      fontFamily: "system-ui,-apple-system,sans-serif",
    });

    const msg = document.createElement("div");
    msg.style.marginBottom = "8px";
    msg.style.lineHeight = "1.4";
    msg.textContent = message;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    Object.assign(retry.style, {
      padding: "8px 14px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "13px",
      background: THEME_PRIMARY,
      color: "#fff",
    });
    retry.addEventListener("click", () => {
      if (lastFailedUserText) sendUserMessage(lastFailedUserText);
    });

    wrap.appendChild(msg);
    wrap.appendChild(retry);
    footer.insertBefore(wrap, footer.firstChild);
    errorBanner = wrap;
  }

  // -------------------------------
  // 6. Fetch business info
  // -------------------------------
  (async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/business-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: BUSINESS_ID }),
      });

      const data = await res.json();

      CHAT_TITLE = data.title || CHAT_TITLE;
      WELCOME_MESSAGE = data.welcome_message || null;

      BUBBLE_ICON = data.bubble_icon || BUBBLE_ICON;
      BUBBLE_COLOR = data.bubble_color || BUBBLE_COLOR;
      BUBBLE_TEXT_COLOR = data.bubble_text_color || BUBBLE_TEXT_COLOR;

      HEADER_COLOR = data.header_color || HEADER_COLOR;
      HEADER_TEXT_COLOR = data.header_text_color || HEADER_TEXT_COLOR;

      THEME_PRIMARY = data.theme_primary || THEME_PRIMARY;
      THEME_SECONDARY = data.theme_secondary || THEME_SECONDARY;

      launcher.innerHTML = BUBBLE_ICON;
      launcher.style.background = BUBBLE_COLOR;
      launcher.style.color = BUBBLE_TEXT_COLOR;

      const header = document.getElementById("chat-header");
      header.innerText = CHAT_TITLE;
      header.style.background = HEADER_COLOR;
      header.style.color = HEADER_TEXT_COLOR;

      document.getElementById("chat-send").style.background = THEME_PRIMARY;
      if (errorBanner) {
        const b = errorBanner.querySelector("button");
        if (b) b.style.background = THEME_PRIMARY;
      }

      if (chatWindow.style.display !== "none" && !hasShownWelcome && WELCOME_MESSAGE) {
        addMessage("assistant", WELCOME_MESSAGE);
        hasShownWelcome = true;
      }
    } catch {
      console.warn("Failed to load business info");
    }
  })();

  // -------------------------------
  // 7. Toggle chat window
  // -------------------------------
  launcher.addEventListener("click", () => {
    const isOpening = chatWindow.style.display === "none";

    if (isOpening) {
      chatWindow.style.display = "flex";
      applyLayout();
      setTimeout(() => {
        chatWindow.style.opacity = "1";
        chatWindow.style.transform = "translateY(0)";
      }, 10);

      if (!hasShownWelcome && WELCOME_MESSAGE) {
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
  // 8. Messages
  // -------------------------------
  function addMessage(role, text) {
    const messages = document.getElementById("chat-messages");
    const row = document.createElement("div");
    const bubbleEl = document.createElement("div");
    row.style.marginBottom = "12px";
    row.style.whiteSpace = "pre-wrap";
    bubbleEl.style.display = "inline-block";
    bubbleEl.style.padding = "8px 12px";
    bubbleEl.style.borderRadius = "12px";
    bubbleEl.textContent = text;

    if (role === "user") {
      row.style.textAlign = "right";
      bubbleEl.style.background = THEME_PRIMARY;
      bubbleEl.style.color = "#fff";
    } else {
      row.style.textAlign = "left";
      bubbleEl.style.background = "#f1f1f1";
      bubbleEl.style.color = "#333";
    }

    row.appendChild(bubbleEl);
    messages.appendChild(row);
    scrollMessagesToBottom();
  }

  function createAssistantStreamingBubble() {
    const messages = document.getElementById("chat-messages");
    const row = document.createElement("div");
    const bubbleEl = document.createElement("div");
    row.style.marginBottom = "12px";
    row.style.textAlign = "left";
    bubbleEl.style.display = "inline-block";
    bubbleEl.style.padding = "8px 12px";
    bubbleEl.style.borderRadius = "12px";
    bubbleEl.style.background = "#f1f1f1";
    bubbleEl.style.color = "#333";
    bubbleEl.style.whiteSpace = "pre-wrap";
    bubbleEl.textContent = "";
    row.appendChild(bubbleEl);
    messages.appendChild(row);
    scrollMessagesToBottom();
    return bubbleEl;
  }

  // -------------------------------
  // 9. Send + stream
  // -------------------------------
  async function sendUserMessage(text) {
    if (!text || isSending) return;

    removeErrorBanner();
    setSending(true);
    addMessage("user", text);
    showTyping();

    let assistantBubble = null;
    let assistantText = "";

    try {
      const response = await fetch(`${API_ORIGIN}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          businessId: BUSINESS_ID,
          sessionId,
          stream: true,
        }),
      });

      const ct = (response.headers.get("content-type") || "").toLowerCase();

      if (!response.ok) {
        hideTyping();
        let fallback =
          "We could not get a reply. Check your connection and try again.";
        try {
          const j = await response.json();
          if (j && typeof j.reply === "string" && j.reply.trim()) {
            fallback = j.reply.trim();
          }
        } catch {
          /* ignore */
        }
        showErrorWithRetry(text, fallback);
        return;
      }

      if (ct.includes("ndjson") && response.body && response.body.getReader) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function handleStreamEvent(ev) {
          if (ev.type === "token" && ev.v) {
            hideTyping();
            if (!assistantBubble) assistantBubble = createAssistantStreamingBubble();
            assistantText += ev.v;
            assistantBubble.textContent = assistantText;
            scrollMessagesToBottom();
          }

          if (ev.type === "error") {
            hideTyping();
            if (assistantBubble && assistantBubble.parentNode) {
              assistantBubble.parentNode.remove();
              assistantBubble = null;
            }
            showErrorWithRetry(
              text,
              typeof ev.message === "string"
                ? ev.message
                : "Something went wrong. Tap Retry."
            );
            return true;
          }

          if (ev.type === "done") {
            hideTyping();
            const finalText = (ev.reply || assistantText || "").trim();
            if (!assistantBubble && finalText) {
              addMessage("assistant", finalText);
            } else if (assistantBubble && !assistantText.trim() && !finalText) {
              assistantBubble.textContent =
                "No response was returned. Please try again.";
            }
          }
          return false;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i].trim();
            if (!line) continue;
            let ev;
            try {
              ev = JSON.parse(line);
            } catch {
              continue;
            }
            if (handleStreamEvent(ev)) return;
          }
        }

        if (buffer.trim()) {
          try {
            const ev = JSON.parse(buffer.trim());
            if (handleStreamEvent(ev)) return;
          } catch {
            /* ignore trailing partial JSON */
          }
        }
      } else {
        hideTyping();
        const data = await response.json();
        const reply =
          data && typeof data.reply === "string" ? data.reply : "";
        addMessage("assistant", reply || "No response was returned.");
      }
    } catch {
      hideTyping();
      showErrorWithRetry(
        text,
        "Network error. Check your connection and tap Retry."
      );
    } finally {
      setSending(false);
      hideTyping();
    }
  }

  function sendMessageFromInput() {
    const input = document.getElementById("chat-input");
    const t = input.value.trim();
    if (!t) return;
    input.value = "";
    sendUserMessage(t);
  }

  document.getElementById("chat-send").addEventListener("click", sendMessageFromInput);
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessageFromInput();
    }
  });
})();
