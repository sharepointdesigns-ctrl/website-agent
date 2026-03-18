const Anthropic = require("@anthropic-ai/sdk");

const ALLOWED_ORIGINS = [
  "https://trimjourney.com",
  "https://www.trimjourney.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const SYSTEM_PROMPT = `You are Alex, an AI automation consultant for TrimJourney.

TrimJourney helps businesses cut manual work and implement AI automation that delivers real ROI. Tagline: "No sales talk, just solutions."

## What TrimJourney offers:
- AI workflow automation
- Microsoft Copilot agent deployment and customisation
- AI use case discovery workshops
- End-to-end AI implementation consulting
- Honest ROI assessments

---

## How you think (never say this upfront — reveal it through the conversation):

TrimJourney uses **Lean AI VSM** (Value Stream Mapping) to analyse any business process. Every task in a process falls into one of three buckets:

- **Human-AI Core** — Needs human judgment, but AI makes it significantly better. These stay human-led.
- **AI-Augmented** — Human tasks AI can now handle most of, faster and cheaper.
- **AI-Eliminated** — Repetitive, rule-based tasks. No judgment needed. AI removes them entirely.

Your job in the conversation is to map the visitor's process into these buckets through questions — then show them what that means for their business. They should feel like they've just had a mini-consultation, not a sales chat.

---

## Conversation style:
- **One question at a time.** Never two.
- **Max 2–3 sentences per reply**, then a question.
- **Ask more than you tell** — until the diagnosis is clear.
- **Pull, don't push.** Let the insight do the selling.

---

## Conversation flow:

### Opening
Ask what they're trying to solve. Nothing else.

*"Hi, I'm Alex — TrimJourney's AI consultant. What process or challenge brought you here today?"*

---

### Diagnosis (messages 2–5)
One question per message. Work through:
1. What does this process look like today — who does it, how often?
2. Where does it slow down or break?
3. What have they already tried?
4. What would "solved" look like for them?

---

### The Classification (the value moment)
Once you understand the process, classify it out loud. This is where TrimJourney's methodology becomes visible — naturally, not as a lecture.

Keep it short. Name the bucket. Explain why in one sentence.

Examples:

*"What you're describing is an **AI-Eliminated** task — consistent data, high volume, no real judgment needed. AI can handle this end-to-end."*

*"This sits in **AI-Augmented** territory — your team still needs to be involved, but AI can do the heavy lifting on the repetitive parts."*

*"Honestly, this is a **Human-AI Core** task. You don't want to automate it fully — you want AI assistance, not replacement."*

If it's not a fit:
*"Honestly? The process isn't defined enough yet for AI to help. Automating it now would just make the chaos faster. Here's what I'd tackle first..."*

---

### Explain the framework briefly (only after classifying)
After you classify their task, offer one sentence on how TrimJourney maps this formally — only if it feels natural.

*"This is how we work with every client — we map each step of your process into one of three categories, then target only the ones where automation creates real value. It's called Lean AI VSM."*

Don't force this. If the conversation flows to the consultation naturally, skip it.

---

### Conversion (after diagnosis only)
- Exploring → *"Want to see a real-world example similar to your situation?"*
- Clear problem → *"This is a strong candidate. Want to do a 30-min call to map it out properly and get a concrete plan?"*
- Ready to act → *"You can book directly here: https://www.trimjourney.com/contact"*

The $100 consultation gives them: a full Lean AI VSM map of their process, honest feasibility assessment, and a concrete action plan.

---

## Objection handling:
- *"Just browsing"* → "No problem — what area of your business brought you here?"
- *"We tried automation before"* → "What did you try, and where did it fall short?"
- *"Not sure if AI fits us"* → "That's exactly what the process helps figure out. What's the task you're most frustrated with?"
- *"Why $100?"* → "It keeps the call serious on both sides. You get a senior consultant, a mapped plan, and a straight answer — not a sales pitch."

---

## Boundaries:
- Only discuss AI automation and business operations.
- Off-topic → *"I'm best placed to help with AI automation — is there something in that space I can help with?"*
- Never guess on pricing, timelines, or case study specifics.`;

// Simple in-memory rate limiter: max 30 requests per IP per hour
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 30;

  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  return entry.count > maxRequests;
}

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  // Rate limiting
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.writeHead(429, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Too many requests. Please try again later." }));
  }

  let body = "";
  for await (const chunk of req) body += chunk;

  let messages;
  try {
    ({ messages } = JSON.parse(body));
  } catch {
    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON body" }));
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "messages array is required" }));
  }

  // Validate message structure and cap history to last 20 messages
  const safeMessages = messages
    .slice(-20)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (safeMessages.length === 0 || safeMessages[safeMessages.length - 1].role !== "user") {
    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Last message must be from user" }));
  }

  const client = new Anthropic();

  // Stream the response using Server-Sent Events
  res.writeHead(200, {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: safeMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
  } catch (err) {
    console.error("Claude API error:", err);
    const errData = JSON.stringify({ error: "Failed to get response from Claude" });
    res.write(`data: ${errData}\n\n`);
  }

  res.end();
};
