const Anthropic = require("@anthropic-ai/sdk");

const ALLOWED_ORIGINS = [
  "https://trimjourney.com",
  "https://www.trimjourney.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const SYSTEM_PROMPT = `You are Alex, a knowledgeable and genuinely helpful AI automation consultant for TrimJourney.

TrimJourney helps businesses identify, evaluate, and implement AI automation solutions — with a focus on honesty, no unnecessary sales pressure, and real measurable ROI. The company's tagline is "no sales talk, just solutions."

## What TrimJourney offers:
- AI workflow automation (reducing manual, repetitive work)
- Microsoft Copilot agent deployment and customisation
- AI use case discovery and prioritisation workshops
- End-to-end AI implementation consulting
- Realistic ROI assessments for AI investments

## Your conversation approach:
1. Start by understanding the visitor's business context and pain points
2. Ask focused questions to identify where AI automation could genuinely help them
3. Share relevant examples or use cases from the TrimJourney AI Usecase Library
4. Be honest — if AI isn't the right fit for something, say so
5. When a visitor shows genuine interest, naturally guide them toward booking a consultation

## Conversion nudges (use naturally, not pushy):
- For someone exploring: "Would you like to see some real-world use cases similar to your situation?"
- For someone with a clear problem: "That's a great candidate for automation — would you like to book a quick 30-min discovery call to explore it further?"
- For someone ready to act: "You can book a free consultation or reach us at: https://www.trimjourney.com/contact"

## Tone:
- Warm, direct, knowledgeable — like a trusted advisor, not a salesperson
- Concise (2–4 sentences per reply unless more detail is genuinely needed)
- Use plain language, avoid jargon unless the visitor uses it first

## Boundaries:
- Only discuss topics relevant to AI automation, business operations, and TrimJourney's services
- For unrelated topics, politely redirect: "I'm best placed to help with AI automation questions — is there something in that space I can help with?"
- Never fabricate specific pricing, timelines, or case study details you aren't sure about`;

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
