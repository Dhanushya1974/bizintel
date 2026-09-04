/**
 * AI consultant. Uses a real LLM when a key is configured, otherwise a
 * data-grounded heuristic so the feature always responds.
 *
 *   OPENAI_API_KEY    -> OpenAI-compatible chat completions
 *                        OPENAI_BASE_URL (default https://api.openai.com/v1),
 *                        OPENAI_MODEL (default gpt-4o-mini).
 *                        Works with OpenRouter: set
 *                          OPENAI_BASE_URL=https://openrouter.ai/api/v1
 *                          OPENAI_MODEL=google/gemma-3-27b-it:free  (or any slug)
 *   ANTHROPIC_API_KEY -> Anthropic messages API (ANTHROPIC_MODEL, default claude-opus-5)
 *   neither           -> local heuristic
 */

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 900);

function systemPrompt(ctx = {}) {
  const opps = Array.isArray(ctx.opportunities) ? ctx.opportunities : [];
  return [
    "You are the BizIntel AI Business Consultant.",
    "BizIntel turns location, competitor and demographic data into ranked, explainable business opportunities.",
    "Answer concisely (2-6 short paragraphs), cite concrete numbers from the data below, and end with one useful follow-up question.",
    "Never invent statistics that are not in the data; if something is unknown, say so and suggest running a full analysis.",
    "",
    "USER CONTEXT:",
    JSON.stringify(
      {
        mode: ctx.mode ?? null,
        idea: ctx.idea ?? null,
        category: ctx.category ?? null,
        budget: ctx.budget ?? null,
        city: ctx.city ?? null,
        pincode: ctx.pincode ?? null,
      },
      null,
      0,
    ),
    "",
    "OPPORTUNITY DATA (BizIntel's current ranked opportunities):",
    JSON.stringify(opps, null, 0),
  ].join("\n");
}

const lastUser = (messages) =>
  [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

// --- providers -----------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOpenAI(messages, ctx) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
  // OpenRouter attribution headers (ignored by OpenAI).
  if (OPENAI_BASE_URL.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER || "http://localhost:3000";
    headers["X-Title"] = process.env.OPENROUTER_TITLE || "BizIntel";
  }
  const payload = JSON.stringify({
    model: OPENAI_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.4,
    messages: [{ role: "system", content: systemPrompt(ctx) }, ...messages],
  });

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(1200 * attempt);
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, { method: "POST", headers, body: payload });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return { text, provider: `openai:${OPENAI_MODEL}` };
      lastErr = new Error("LLM returned empty content");
      continue;
    }
    const bodyText = await res.text();
    lastErr = new Error(`LLM ${res.status}: ${bodyText}`);
    if (res.status !== 429 && res.status < 500) break; // only retry throttling / server errors
  }
  throw lastErr;
}

async function callAnthropic(messages, ctx) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(ctx),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text, provider: `anthropic:${ANTHROPIC_MODEL}` };
}

// --- heuristic fallback -------------------------------------------------
export function heuristicAnswer(question, ctx = {}) {
  const q = String(question || "").toLowerCase();
  const opps = Array.isArray(ctx.opportunities) ? ctx.opportunities : [];
  const money = (n) => (typeof n === "number" ? `$${n.toLocaleString()}` : "n/a");

  const ranked = [...opps].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const byText =
    opps.find((o) => q && o.name && q.includes(o.name.toLowerCase().split(" ")[0])) ||
    (ctx.category && opps.find((o) => o.category === ctx.category));
  const focus = byText || ranked[0];
  const where = [ctx.city, ctx.pincode].filter(Boolean).join(" ") || "your market";

  if (!focus) {
    return "I don't have opportunity data loaded yet. Run a New Analysis for your location and I'll walk through the results with you.\n\nWhat business type and location should we start with?";
  }

  const head = `For **${focus.name}** (${focus.category}) in ${where}: opportunity score ${focus.score}/100, demand index ${focus.demand}, competition index ${focus.competition}, projected break-even ${focus.breakEvenMonths} months.`;

  let body;
  if (/\brisk|risky|downside|threat/.test(q)) {
    body = `Key risks: ${(focus.risks || []).join("; ") || "none flagged in the current data"}. With a competition index of ${focus.competition}, ${focus.competition > 55 ? "differentiation on product and experience is essential" : "the field is relatively open, so speed to launch matters"}.`;
  } else if (/budget|invest|capital|afford|cost|money/.test(q)) {
    body = `Estimated investment is ${money(focus.investmentMin)}–${money(focus.investmentMax)}. Your stated budget is ${ctx.budget || "not set"} — ${ctx.budget ? "compare that against the lower bound and keep 3–6 months of runway aside" : "set a budget in Settings so I can flag which options are in reach"}.`;
  } else if (/compare|versus|\bvs\b|better/.test(q) && ranked.length > 1) {
    const [a, b] = ranked;
    body = `Top two by score: ${a.name} (${a.score}, demand ${a.demand}/comp ${a.competition}) vs ${b.name} (${b.score}, demand ${b.demand}/comp ${b.competition}). ${a.name} leads on the blended signal; ${b.name} is the pick if you want ${b.competition < a.competition ? "less direct competition" : "higher demand headroom"}.`;
  } else if (/competitor|competition|rival|saturat/.test(q)) {
    body = `Competition index is ${focus.competition}. ${focus.competition <= 40 ? "That's under-served — a well-run entrant can take share quickly." : focus.competition <= 60 ? "Moderately contested — you'll need a clear wedge (format, price, or daypart)." : "Crowded — only enter with a distinct concept or an adjacent white-space."}`;
  } else if (/report|summary|investor|deck|plan/.test(q)) {
    body = `I can frame the one-pager now: score ${focus.score}, demand ${focus.demand}, competition ${focus.competition}, investment ${money(focus.investmentMin)}–${money(focus.investmentMax)}, break-even ${focus.breakEvenMonths} mo. Open Projects & Reports to generate the full consolidated report (market, competitors, location, financials, insights).`;
  } else {
    body = `${focus.rationale || "This ranks well on the blended demand-vs-competition signal."} Next step: pull the full analysis and shortlist two candidate sites.`;
  }

  return `${head}\n\n${body}\n\nWant me to go deeper on demand, competitors, or the financials?`;
}

// --- entry point ------------------------------------------------------
export async function chat(messages, context = {}) {
  try {
    if (process.env.OPENAI_API_KEY) return await callOpenAI(messages, context);
    if (process.env.ANTHROPIC_API_KEY) return await callAnthropic(messages, context);
  } catch (err) {
    console.warn(`[consultant] LLM call failed, using heuristic: ${err.message}`);
    return { text: heuristicAnswer(lastUser(messages), context), provider: "heuristic", warning: "llm_unavailable" };
  }
  return { text: heuristicAnswer(lastUser(messages), context), provider: "heuristic" };
}
