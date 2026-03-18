(function () {
  "use strict";

  // Prevent double-init
  if (window.__TJChatInit) return;
  window.__TJChatInit = true;

  var cfg = window.TrimJourneyChatConfig || {};
  var API_URL = (cfg.apiUrl || "").replace(/\/$/, "") + "/api/chat";
  var BRAND_COLOR = "#1B3A5C";
  var ACCENT_COLOR = "#4A8FE7";
  var OPEN_MESSAGE =
    "Hi! I'm Alex from TrimJourney 👋 How can I help you explore AI automation for your business today?";

  // ── Styles ──────────────────────────────────────────────────────────────────
  var css = `
    #tj-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${BRAND_COLOR}; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #tj-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
    #tj-chat-btn svg { width: 26px; height: 26px; fill: #fff; }

    #tj-chat-badge {
      position: absolute; top: -4px; right: -4px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #e74c3c; border: 2px solid #fff;
      display: none; align-items: center; justify-content: center;
      font: 700 10px/1 sans-serif; color: #fff;
    }

    #tj-chat-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 99999;
      width: 370px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 120px);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.22);
      display: none; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    #tj-chat-header {
      background: ${BRAND_COLOR}; color: #fff;
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #tj-chat-header .tj-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: ${ACCENT_COLOR}; display: flex; align-items: center;
      justify-content: center; font-size: 18px; flex-shrink: 0;
    }
    #tj-chat-header .tj-title { flex: 1; }
    #tj-chat-header .tj-title strong { display: block; font-size: 14px; }
    #tj-chat-header .tj-title span { font-size: 12px; opacity: .75; }
    #tj-chat-close {
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 4px; border-radius: 4px; opacity: .75; line-height: 1;
      font-size: 20px; transition: opacity .15s;
    }
    #tj-chat-close:hover { opacity: 1; }

    #tj-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      background: #f7f9fc; display: flex; flex-direction: column; gap: 10px;
    }
    #tj-chat-messages::-webkit-scrollbar { width: 4px; }
    #tj-chat-messages::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

    .tj-msg { max-width: 82%; line-height: 1.45; word-wrap: break-word; }
    .tj-msg.tj-ai {
      align-self: flex-start;
      background: #fff; color: #1a2332;
      padding: 10px 13px; border-radius: 4px 14px 14px 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }
    .tj-msg.tj-user {
      align-self: flex-end;
      background: ${BRAND_COLOR}; color: #fff;
      padding: 10px 13px; border-radius: 14px 4px 14px 14px;
    }

    .tj-typing { display: flex; gap: 4px; align-items: center; padding: 10px 13px; }
    .tj-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #aaa;
      animation: tj-bounce .9s infinite ease-in-out;
    }
    .tj-typing span:nth-child(2) { animation-delay: .15s; }
    .tj-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes tj-bounce {
      0%, 80%, 100% { transform: scale(.7); opacity: .5; }
      40% { transform: scale(1); opacity: 1; }
    }

    #tj-chat-form {
      display: flex; gap: 8px; padding: 12px;
      background: #fff; border-top: 1px solid #e8ecf0; flex-shrink: 0;
    }
    #tj-chat-input {
      flex: 1; border: 1px solid #dde2e8; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; outline: none;
      resize: none; height: 38px; line-height: 1.4;
      font-family: inherit; transition: border-color .15s;
    }
    #tj-chat-input:focus { border-color: ${ACCENT_COLOR}; }
    #tj-chat-send {
      width: 38px; height: 38px; border-radius: 8px; border: none;
      background: ${BRAND_COLOR}; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    #tj-chat-send:hover { background: ${ACCENT_COLOR}; }
    #tj-chat-send:disabled { opacity: .5; cursor: not-allowed; }
    #tj-chat-send svg { width: 18px; height: 18px; fill: #fff; }

    #tj-chat-footer {
      text-align: center; padding: 6px; font-size: 11px;
      color: #aaa; background: #fff; border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    #tj-chat-footer a { color: #aaa; text-decoration: none; }
    #tj-chat-footer a:hover { color: #666; }
  `;

  // ── DOM helpers ──────────────────────────────────────────────────────────────
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.assign(e, attrs || {});
    (children || []).forEach(function (c) {
      if (typeof c === "string") e.insertAdjacentHTML("beforeend", c);
      else e.appendChild(c);
    });
    return e;
  }

  function injectStyle() {
    var s = document.createElement("style");
    s.id = "tj-chat-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── State ────────────────────────────────────────────────────────────────────
  var messages = []; // { role: 'user'|'assistant', content: string }
  var isOpen = false;
  var isStreaming = false;
  var hasGreeted = false;

  // ── Build UI ──────────────────────────────────────────────────────────────────
  function buildUI() {
    injectStyle();

    // Floating button
    var btn = el("button", { id: "tj-chat-btn", title: "Chat with TrimJourney AI", type: "button" }, [
      '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-2 10H6v-2h12v2zm0-4H6V6h12v2z"/></svg>',
    ]);
    var badge = el("span", { id: "tj-chat-badge" }, ["1"]);
    btn.style.position = "fixed";
    btn.appendChild(badge);
    btn.addEventListener("click", toggleChat);

    // Chat window
    var header = el("div", { id: "tj-chat-header" }, [
      '<div class="tj-avatar">🤖</div>',
      '<div class="tj-title"><strong>Alex — TrimJourney AI</strong><span>AI Automation Consultant</span></div>',
    ]);
    var closeBtn = el("button", { id: "tj-chat-close", type: "button", title: "Close chat" }, ["✕"]);
    closeBtn.addEventListener("click", toggleChat);
    header.appendChild(closeBtn);

    var msgList = el("div", { id: "tj-chat-messages" });

    var input = el("textarea", {
      id: "tj-chat-input",
      placeholder: "Ask about AI automation...",
      rows: 1,
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    var sendBtn = el("button", { id: "tj-chat-send", type: "button", title: "Send" }, [
      '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    ]);
    sendBtn.addEventListener("click", sendMessage);

    var form = el("div", { id: "tj-chat-form" }, []);
    form.appendChild(input);
    form.appendChild(sendBtn);

    var footer = el("div", { id: "tj-chat-footer" }, [
      'Powered by <a href="https://www.trimjourney.com" target="_blank">TrimJourney</a> &amp; Claude AI',
    ]);

    var win = el("div", { id: "tj-chat-window" }, []);
    win.appendChild(header);
    win.appendChild(msgList);
    win.appendChild(form);
    win.appendChild(footer);

    document.body.appendChild(btn);
    document.body.appendChild(win);

    // Show badge after 3 seconds to draw attention
    setTimeout(function () {
      if (!isOpen) badge.style.display = "flex";
    }, 3000);
  }

  // ── Toggle open/close ────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    var win = document.getElementById("tj-chat-window");
    var badge = document.getElementById("tj-chat-badge");
    win.style.display = isOpen ? "flex" : "none";
    badge.style.display = "none";

    if (isOpen && !hasGreeted) {
      hasGreeted = true;
      appendMessage("assistant", OPEN_MESSAGE);
      messages.push({ role: "assistant", content: OPEN_MESSAGE });
      setTimeout(function () {
        document.getElementById("tj-chat-input").focus();
      }, 100);
    }
  }

  // ── Append a message bubble ──────────────────────────────────────────────────
  function appendMessage(role, text) {
    var list = document.getElementById("tj-chat-messages");
    var div = el("div", { className: "tj-msg " + (role === "user" ? "tj-user" : "tj-ai") }, [
      escapeHtml(text).replace(/\n/g, "<br>"),
    ]);
    div.setAttribute("data-role", role);
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
    return div;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Show/hide typing indicator ────────────────────────────────────────────────
  function showTyping() {
    var list = document.getElementById("tj-chat-messages");
    var div = el("div", { className: "tj-msg tj-ai tj-typing", id: "tj-typing-indicator" }, [
      "<span></span><span></span><span></span>",
    ]);
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  function hideTyping() {
    var ind = document.getElementById("tj-typing-indicator");
    if (ind) ind.remove();
  }

  // ── Send a message and stream the response ────────────────────────────────────
  function sendMessage() {
    if (isStreaming) return;
    var input = document.getElementById("tj-chat-input");
    var text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.style.height = "38px";
    appendMessage("user", text);
    messages.push({ role: "user", content: text });

    isStreaming = true;
    document.getElementById("tj-chat-send").disabled = true;
    showTyping();

    var aiDiv = null;
    var aiText = "";

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        function read() {
          return reader.read().then(function (result) {
            if (result.done) {
              finishStream();
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop();

            parts.forEach(function (part) {
              var line = part.trim();
              if (!line.startsWith("data: ")) return;
              var payload = line.slice(6);
              if (payload === "[DONE]") return;
              try {
                var parsed = JSON.parse(payload);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.text) {
                  if (!aiDiv) {
                    hideTyping();
                    aiDiv = appendMessage("assistant", "");
                  }
                  aiText += parsed.text;
                  aiDiv.innerHTML = escapeHtml(aiText).replace(/\n/g, "<br>");
                  document
                    .getElementById("tj-chat-messages")
                    .scrollTo({ top: 99999, behavior: "smooth" });
                }
              } catch (e) {
                // ignore parse errors on partial chunks
              }
            });

            return read();
          });
        }
        return read();
      })
      .catch(function (err) {
        hideTyping();
        appendMessage("assistant", "Sorry, I'm having trouble connecting right now. Please try again in a moment.");
        console.error("[TJ Chatbot]", err);
        finishStream();
      });

    function finishStream() {
      if (aiText) messages.push({ role: "assistant", content: aiText });
      hideTyping();
      isStreaming = false;
      document.getElementById("tj-chat-send").disabled = false;
      document.getElementById("tj-chat-input").focus();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if (!API_URL || API_URL === "/api/chat") {
      console.warn("[TJ Chatbot] No apiUrl configured in window.TrimJourneyChatConfig");
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildUI);
    } else {
      buildUI();
    }
  }

  init();
})();
