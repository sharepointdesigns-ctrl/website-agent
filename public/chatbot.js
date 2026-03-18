(function () {
  "use strict";

  if (window.__TJChatInit) return;
  window.__TJChatInit = true;

  var cfg = window.TrimJourneyChatConfig || {};
  var API_URL = (cfg.apiUrl || "").replace(/\/$/, "") + "/api/chat";

  var OPEN_MESSAGE =
    "Hi! I'm Alex, TrimJourney's AI consultant 👋 I help businesses find the right AI automation opportunities — no jargon, no pressure.\n\nWhat's a process in your business that feels slow or repetitive?";

  var SUGGESTIONS = [
    "What can AI automate for my business?",
    "How does TrimJourney work?",
    "What's a Microsoft Copilot Agent?",
  ];

  // ── Styles ───────────────────────────────────────────────────────────────────
  var css = `
    @keyframes tj-pulse {
      0% { box-shadow: 0 0 0 0 rgba(59,130,246,.45); }
      70% { box-shadow: 0 0 0 14px rgba(59,130,246,0); }
      100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
    }
    @keyframes tj-slideup {
      from { opacity:0; transform: translateY(18px) scale(.97); }
      to   { opacity:1; transform: translateY(0)    scale(1);   }
    }
    @keyframes tj-fadein {
      from { opacity:0; transform: translateY(6px); }
      to   { opacity:1; transform: translateY(0); }
    }
    @keyframes tj-bounce {
      0%,80%,100% { transform: scale(.6); opacity:.4; }
      40%         { transform: scale(1);  opacity:1;  }
    }
    @keyframes tj-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(180deg); }
    }

    #tj-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 999999;
      width: 64px; height: 64px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #0F2445 0%, #1E40AF 100%);
      cursor: pointer;
      box-shadow: 0 6px 24px rgba(15,36,69,.45), 0 2px 8px rgba(0,0,0,.2);
      display: flex; align-items: center; justify-content: center;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
      animation: tj-pulse 2.8s ease-out 3s 3;
    }
    #tj-chat-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 10px 32px rgba(15,36,69,.55), 0 4px 12px rgba(0,0,0,.25);
    }
    #tj-chat-btn.tj-open { animation: none; transform: scale(1); }
    #tj-chat-btn.tj-open svg.tj-icon-chat { display: none; }
    #tj-chat-btn.tj-open svg.tj-icon-close { display: block; }
    #tj-chat-btn svg.tj-icon-chat { width: 30px; height: 30px; fill: #fff; display: block; }
    #tj-chat-btn svg.tj-icon-close { width: 24px; height: 24px; fill: #fff; display: none; }

    #tj-chat-badge {
      position: absolute; top: -3px; right: -3px;
      width: 20px; height: 20px; border-radius: 50%;
      background: linear-gradient(135deg,#ef4444,#dc2626);
      border: 2.5px solid #fff;
      display: none; align-items: center; justify-content: center;
      font: 700 10px/1 -apple-system,sans-serif; color: #fff;
      box-shadow: 0 2px 6px rgba(220,38,38,.4);
    }

    #tj-chat-label {
      position: absolute; right: 72px; bottom: 50%;
      transform: translateY(50%);
      background: #0F2445; color: #fff;
      padding: 6px 12px; border-radius: 20px;
      font: 600 12px/1 -apple-system,sans-serif;
      white-space: nowrap; pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
      opacity: 0; transition: opacity .2s;
    }
    #tj-chat-btn:hover #tj-chat-label,
    #tj-chat-btn:focus #tj-chat-label { opacity: 1; }

    #tj-chat-window {
      position: fixed; bottom: 106px; right: 28px; z-index: 999998;
      width: 390px; max-width: calc(100vw - 40px);
      height: 560px; max-height: calc(100vh - 130px);
      border-radius: 20px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 20px rgba(0,0,0,.12);
      display: none; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; background: #fff;
      animation: tj-slideup .3s cubic-bezier(.22,1,.36,1) both;
    }

    /* ── Header ── */
    #tj-chat-header {
      background: linear-gradient(135deg, #0F2445 0%, #1a3a6e 60%, #1E40AF 100%);
      padding: 16px 18px 14px; display: flex; align-items: center; gap: 12px;
      flex-shrink: 0; position: relative; overflow: hidden;
    }
    #tj-chat-header::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 80% 20%, rgba(99,179,237,.15) 0%, transparent 65%);
      pointer-events: none;
    }
    .tj-avatar-wrap {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,#3B82F6,#1D4ED8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 2px rgba(255,255,255,.25);
      font-size: 22px;
    }
    .tj-header-text { flex: 1; min-width: 0; }
    .tj-header-text strong {
      display: block; color: #fff; font-size: 15px;
      font-weight: 700; letter-spacing: -.01em; line-height: 1.2;
    }
    .tj-header-sub {
      display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .tj-online-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #4ade80;
      box-shadow: 0 0 0 2px rgba(74,222,128,.3); flex-shrink: 0;
    }
    .tj-header-sub span { color: rgba(255,255,255,.7); font-size: 12px; }
    #tj-chat-close {
      background: rgba(255,255,255,.12); border: none; color: #fff;
      width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s; flex-shrink: 0;
    }
    #tj-chat-close:hover { background: rgba(255,255,255,.22); }
    #tj-chat-close svg { width: 14px; height: 14px; fill: #fff; }

    /* ── Brand strip ── */
    #tj-brand-strip {
      background: linear-gradient(90deg,#0F2445,#1E3A6E);
      padding: 5px 18px; display: flex; align-items: center; justify-content: center;
      gap: 6px; flex-shrink: 0;
    }
    #tj-brand-strip span { color: rgba(255,255,255,.55); font-size: 11px; font-weight: 500; }
    #tj-brand-strip .tj-brand-name { color: rgba(255,255,255,.85); font-weight: 700; }

    /* ── Messages ── */
    #tj-chat-messages {
      flex: 1; overflow-y: auto; padding: 18px 16px 12px;
      background: #F1F5FB;
      display: flex; flex-direction: column; gap: 12px;
    }
    #tj-chat-messages::-webkit-scrollbar { width: 4px; }
    #tj-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #tj-chat-messages::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }

    .tj-msg-row {
      display: flex; align-items: flex-end; gap: 8px;
      animation: tj-fadein .25s ease both;
    }
    .tj-msg-row.tj-user-row { flex-direction: row-reverse; }

    .tj-row-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,#3B82F6,#1D4ED8);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,.12);
    }
    .tj-user-row .tj-row-avatar {
      background: linear-gradient(135deg,#64748B,#334155);
    }

    .tj-msg {
      max-width: 78%; line-height: 1.5; word-wrap: break-word;
      font-size: 14px;
    }
    .tj-msg.tj-ai {
      background: #fff; color: #1a2332;
      padding: 11px 14px; border-radius: 4px 16px 16px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      border-left: 3px solid #3B82F6;
    }
    .tj-msg.tj-user {
      background: linear-gradient(135deg, #0F2445 0%, #1E40AF 100%);
      color: #fff; padding: 11px 14px;
      border-radius: 16px 4px 16px 16px;
      box-shadow: 0 2px 8px rgba(15,36,69,.25);
    }

    /* ── Typing ── */
    .tj-typing-row {
      display: flex; align-items: flex-end; gap: 8px;
      animation: tj-fadein .2s ease both;
    }
    .tj-typing-bubble {
      background: #fff; padding: 12px 16px;
      border-radius: 4px 16px 16px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      border-left: 3px solid #3B82F6;
      display: flex; gap: 5px; align-items: center;
    }
    .tj-typing-bubble span {
      width: 7px; height: 7px; border-radius: 50%; background: #93C5FD;
      animation: tj-bounce 1s infinite ease-in-out;
    }
    .tj-typing-bubble span:nth-child(2) { animation-delay: .18s; }
    .tj-typing-bubble span:nth-child(3) { animation-delay: .36s; }

    /* ── Quick suggestions ── */
    #tj-suggestions {
      display: flex; flex-wrap: wrap; gap: 7px; padding: 0 16px 14px;
      background: #F1F5FB; flex-shrink: 0;
    }
    .tj-suggestion {
      background: #fff; border: 1.5px solid #BFDBFE;
      color: #1E40AF; font-size: 12px; font-weight: 500;
      padding: 6px 12px; border-radius: 20px; cursor: pointer;
      transition: all .15s; white-space: nowrap;
      font-family: inherit;
    }
    .tj-suggestion:hover {
      background: #EFF6FF; border-color: #3B82F6;
      box-shadow: 0 2px 8px rgba(59,130,246,.15);
    }

    /* ── Input area ── */
    #tj-chat-form {
      display: flex; gap: 8px; padding: 12px 14px;
      background: #fff; border-top: 1px solid #E2E8F0; flex-shrink: 0;
      align-items: flex-end;
    }
    #tj-chat-input {
      flex: 1; border: 1.5px solid #E2E8F0; border-radius: 12px;
      padding: 10px 13px; font-size: 14px; outline: none;
      resize: none; min-height: 40px; max-height: 100px; line-height: 1.45;
      font-family: inherit; transition: border-color .15s, box-shadow .15s;
      background: #F8FAFF; color: #1e293b;
    }
    #tj-chat-input:focus {
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59,130,246,.12);
      background: #fff;
    }
    #tj-chat-input::placeholder { color: #94A3B8; }
    #tj-chat-send {
      width: 40px; height: 40px; border-radius: 12px; border: none; flex-shrink: 0;
      background: linear-gradient(135deg, #0F2445, #1E40AF);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: opacity .15s, transform .15s; box-shadow: 0 2px 8px rgba(30,64,175,.35);
    }
    #tj-chat-send:hover:not(:disabled) { opacity:.9; transform: scale(1.05); }
    #tj-chat-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    #tj-chat-send svg { width: 18px; height: 18px; fill: #fff; }

    /* ── Footer ── */
    #tj-chat-footer {
      text-align: center; padding: 7px 14px 8px;
      background: #fff; border-top: 1px solid #F1F5F9; flex-shrink: 0;
    }
    #tj-chat-footer span { color: #94A3B8; font-size: 11px; }
    #tj-chat-footer a { color: #64748B; text-decoration: none; font-weight: 600; }
    #tj-chat-footer a:hover { color: #1E40AF; }
  `;

  // ── DOM helper ───────────────────────────────────────────────────────────────
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.assign(e, attrs || {});
    (children || []).forEach(function (c) {
      typeof c === "string" ? e.insertAdjacentHTML("beforeend", c) : e.appendChild(c);
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
  var messages = [];
  var isOpen = false;
  var isStreaming = false;
  var hasGreeted = false;
  var suggestionsShown = false;

  // ── Build UI ──────────────────────────────────────────────────────────────────
  function buildUI() {
    injectStyle();

    // ── Floating button ──────────────────────────────────────────────────────
    var btn = el("button", { id: "tj-chat-btn", title: "Chat with TrimJourney AI", type: "button" }, [
      // Chat icon
      '<svg class="tj-icon-chat" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M6 4h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H10l-6 6V6a2 2 0 0 1 2-2z" fill="white" opacity=".95"/>'
      + '<circle cx="11" cy="12" r="1.8" fill="#1E40AF"/>'
      + '<circle cx="16" cy="12" r="1.8" fill="#1E40AF"/>'
      + '<circle cx="21" cy="12" r="1.8" fill="#1E40AF"/>'
      + '</svg>',
      // Close icon
      '<svg class="tj-icon-close" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>',
      '<span id="tj-chat-label">Ask Alex</span>',
    ]);
    var badge = el("span", { id: "tj-chat-badge" }, ["1"]);
    btn.appendChild(badge);
    btn.addEventListener("click", toggleChat);

    // ── Header ───────────────────────────────────────────────────────────────
    var header = el("div", { id: "tj-chat-header" });
    header.innerHTML =
      '<div class="tj-avatar-wrap">🤖</div>'
      + '<div class="tj-header-text">'
      +   '<strong>Alex · TrimJourney AI</strong>'
      +   '<div class="tj-header-sub">'
      +     '<div class="tj-online-dot"></div>'
      +     '<span>AI Automation Consultant · Online</span>'
      +   '</div>'
      + '</div>';
    var closeBtn = el("button", { id: "tj-chat-close", type: "button", title: "Close" });
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
    closeBtn.addEventListener("click", toggleChat);
    header.appendChild(closeBtn);

    // ── Brand strip ───────────────────────────────────────────────────────────
    var brandStrip = el("div", { id: "tj-brand-strip" });
    brandStrip.innerHTML =
      '<span>Powered by </span>'
      + '<span class="tj-brand-name">TrimJourney</span>'
      + '<span> &nbsp;×&nbsp; Claude AI</span>';

    // ── Messages ──────────────────────────────────────────────────────────────
    var msgList = el("div", { id: "tj-chat-messages" });

    // ── Suggestions ───────────────────────────────────────────────────────────
    var suggestionsBar = el("div", { id: "tj-suggestions" });

    // ── Input ────────────────────────────────────────────────────────────────
    var input = el("textarea", {
      id: "tj-chat-input",
      placeholder: "Ask about AI automation...",
      rows: 1,
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener("input", function () {
      this.style.height = "40px";
      this.style.height = Math.min(this.scrollHeight, 100) + "px";
    });

    var sendBtn = el("button", { id: "tj-chat-send", type: "button", title: "Send" });
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/></svg>';
    sendBtn.addEventListener("click", sendMessage);

    var form = el("div", { id: "tj-chat-form" });
    form.appendChild(input);
    form.appendChild(sendBtn);

    var footer = el("div", { id: "tj-chat-footer" });
    footer.innerHTML = '<span>Powered by <a href="https://www.trimjourney.com" target="_blank">TrimJourney</a> &amp; Claude AI · <a href="https://www.trimjourney.com/contact" target="_blank">Book a call</a></span>';

    // ── Assemble window ───────────────────────────────────────────────────────
    var win = el("div", { id: "tj-chat-window" });
    win.appendChild(header);
    win.appendChild(brandStrip);
    win.appendChild(msgList);
    win.appendChild(suggestionsBar);
    win.appendChild(form);
    win.appendChild(footer);

    document.body.appendChild(btn);
    document.body.appendChild(win);

    setTimeout(function () { if (!isOpen) badge.style.display = "flex"; }, 4000);
  }

  // ── Toggle ───────────────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    var win = document.getElementById("tj-chat-window");
    var btn = document.getElementById("tj-chat-btn");
    var badge = document.getElementById("tj-chat-badge");

    if (isOpen) {
      win.style.display = "flex";
      // Re-trigger animation
      win.style.animation = "none";
      win.offsetHeight; // reflow
      win.style.animation = "";
      btn.classList.add("tj-open");
      badge.style.display = "none";

      if (!hasGreeted) {
        hasGreeted = true;
        appendMessage("assistant", OPEN_MESSAGE);
        messages.push({ role: "assistant", content: OPEN_MESSAGE });
        setTimeout(showSuggestions, 400);
        setTimeout(function () { document.getElementById("tj-chat-input").focus(); }, 150);
      }
    } else {
      win.style.display = "none";
      btn.classList.remove("tj-open");
    }
  }

  // ── Quick suggestions ─────────────────────────────────────────────────────────
  function showSuggestions() {
    if (suggestionsShown) return;
    suggestionsShown = true;
    var bar = document.getElementById("tj-suggestions");
    SUGGESTIONS.forEach(function (text) {
      var btn = el("button", { className: "tj-suggestion", type: "button" }, [text]);
      btn.addEventListener("click", function () {
        bar.style.display = "none";
        document.getElementById("tj-chat-input").value = text;
        sendMessage();
      });
      bar.appendChild(btn);
    });
  }

  // ── Message bubble ────────────────────────────────────────────────────────────
  function appendMessage(role, text) {
    var list = document.getElementById("tj-chat-messages");
    var isAI = role === "assistant";

    var row = el("div", { className: "tj-msg-row" + (isAI ? "" : " tj-user-row") });
    var avatarDiv = el("div", { className: "tj-row-avatar" }, [isAI ? "🤖" : "💬"]);
    var bubble = el("div", { className: "tj-msg " + (isAI ? "tj-ai" : "tj-user") });
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    if (isAI) {
      row.appendChild(avatarDiv);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
      row.appendChild(avatarDiv);
    }

    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    return bubble;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── Typing indicator ──────────────────────────────────────────────────────────
  function showTyping() {
    var list = document.getElementById("tj-chat-messages");
    var row = el("div", { className: "tj-typing-row", id: "tj-typing-row" });
    var avatar = el("div", { className: "tj-row-avatar" }, ["🤖"]);
    var bubble = el("div", { className: "tj-typing-bubble" });
    bubble.innerHTML = "<span></span><span></span><span></span>";
    row.appendChild(avatar);
    row.appendChild(bubble);
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  function hideTyping() {
    var r = document.getElementById("tj-typing-row");
    if (r) r.remove();
  }

  // ── Send & stream ─────────────────────────────────────────────────────────────
  function sendMessage() {
    if (isStreaming) return;
    var input = document.getElementById("tj-chat-input");
    var text = input.value.trim();
    if (!text) return;

    // Hide suggestions once user sends
    var sugg = document.getElementById("tj-suggestions");
    if (sugg) sugg.style.display = "none";

    input.value = "";
    input.style.height = "40px";
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
            if (result.done) { finishStream(); return; }
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
                  if (!aiDiv) { hideTyping(); aiDiv = appendMessage("assistant", ""); }
                  aiText += parsed.text;
                  aiDiv.innerHTML = escapeHtml(aiText).replace(/\n/g, "<br>");
                  var list = document.getElementById("tj-chat-messages");
                  list.scrollTop = list.scrollHeight;
                }
              } catch(e) {}
            });
            return read();
          });
        }
        return read();
      })
      .catch(function (err) {
        hideTyping();
        appendMessage("assistant", "Sorry, I'm having a moment — please try again in a second.");
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
      console.warn("[TJ Chatbot] No apiUrl set in window.TrimJourneyChatConfig");
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
