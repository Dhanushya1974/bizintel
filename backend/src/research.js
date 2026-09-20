/**
 * Live web research on a business idea. Uses OpenRouter's web-search plugin (":online"
 * models get fresh search results and return url_citation annotations), so every
 * figure comes from a cited web source. Needs OPENAI_BASE_URL pointing at OpenRouter.
 */

import { understandIdea } from "./idea.js";

const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM = `You are a market researcher. Search the web for CURRENT information on the business idea and location given (use the interpreted description to avoid confusing the industry with something else), then reply with ONLY a JSON object:
{
 "whatItIs": 2 sentences on what this business is / means,
 "marketSize": string with figure, year and geography if a source states one, else null,
 "growth": string with growth rate/outlook if a source states one, else null,
 "trends": array of up to 5 short, current trends,
 "typicalInvestment": string with typical startup cost range if a source states one, else null,
 "leadingPlayers": array of up to 6 real companies/brands operating in this space (prefer the given location),
 "regulations": array of up to 4 licences/rules that apply in the given country,
 "opportunities": array of up to 4 concrete opportunities or gaps,
 "risks": array of up to 4 concrete risks
}
Rules: use only facts found in the search results; put null or [] where the sources say nothing; never invent numbers; keep each string under 200 characters.`;

const cache = new Map();
const TTL_MS = 12 * 60 * 60 * 1000;

// Models sometimes inline markdown links / citation marks; sources are shown separately.
const clean = (t) =>
  t
    .replace(/\s*\[([^\]]*)\]\(https?:[^)]*\)/g, "")
    .replace(/\s*\[\d+(?:,\s*\d+)*\]/g, "")
    .trim()
    .slice(0, 240);
const str = (v) => {
  const t = typeof v === "string" ? clean(v) : "";
  return t && t.toLowerCase() !== "null" ? t : null;
};
const arr = (v, n) =>
  (Array.isArray(v) ? v : [])
    .filter((s) => typeof s === "string")
    .map(clean)
    .filter(Boolean)
    .slice(0, n);

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const DDG_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const stripTags = (h) =>
  h
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Web search via Bing HTML (result links are base64-wrapped redirects) -> [{ title, url, snippet }]. */
async function bingSearch(query, limit = 6) {
  const res = await fetch("https://www.bing.com/search?setlang=en&q=" + encodeURIComponent(query), {
    headers: { "User-Agent": DDG_UA, "Accept-Language": "en-IN,en;q=0.9" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`bing ${res.status}`);
  const html = await res.text();
  const out = [];
  for (const block of html.split(/<li class="b_algo"/).slice(1)) {
    const h2 = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!h2) continue;
    let url = h2[1].replace(/&amp;/g, "&");
    const enc = url.match(/[?&]u=a1([^&]+)/);
    if (enc) {
      try {
        url = Buffer.from(enc[1], "base64url").toString("utf8");
      } catch {
        continue;
      }
    }
    if (!/^https?:\/\//.test(url)) continue;
    const snip = block.match(/<p[^>]*class="b_lineclamp\d*"[^>]*>([\s\S]*?)<\/p>/) || block.match(/<div class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    out.push({ title: stripTags(h2[2]).slice(0, 120), url, snippet: stripTags(snip?.[1] ?? "").slice(0, 400) });
    if (out.length >= limit) break;
  }
  return out;
}

/** DuckDuckGo HTML search; it serves a bot-check page (no results) when it throttles us. */
async function ddgSearch(query, limit = 6) {
  const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
    headers: { "User-Agent": DDG_UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const html = await res.text();
  const out = [];
  const re = /class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    let url = m[1].replace(/&amp;/g, "&");
    const wrapped = url.match(/[?&]uddg=([^&]+)/);
    if (wrapped) url = decodeURIComponent(wrapped[1]);
    if (!/^https?:\/\//.test(url)) continue;
    out.push({ title: stripTags(m[2]).slice(0, 120), url, snippet: stripTags(m[3]).slice(0, 400) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Bing first (reliable from servers), DuckDuckGo as a fallback. */
export async function webSearch(query, limit = 6) {
  for (const engine of [bingSearch, ddgSearch]) {
    try {
      const r = await engine(query, limit);
      if (r.length) return r;
    } catch {
      // try the next engine
    }
  }
  return [];
}

/** Search the web ourselves, then let Gemini (free text generation) extract facts ONLY from the results. */
async function geminiResearch(text, where, model = GEMINI_MODEL, profile = null) {
  const place = where || "India";
  const type = profile?.businessType || text;
  const gloss = profile?.summary ? ` (${profile.summary})` : "";
  // Search on the interpreted business, with a disambiguating hint ("cloud kitchen" != cloud computing).
  const q = profile?.searchPhrase || `${type} ${(profile?.competitorTerms ?? []).slice(0, 2).join(" ")} business`.trim();
  const queries = [
    `${q} market size growth ${place}`,
    `${q} startup cost investment ${place}`,
    `${q} top companies competitors ${place}`,
    `${q} licence regulations ${place}`,
  ];
  const settled = await Promise.allSettled(queries.map((q) => webSearch(q)));
  const seen = new Set();
  const results = settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((r) => !seen.has(r.url) && seen.add(r.url))
    .slice(0, 16);
  if (!results.length) throw new Error("web search returned no results");

  const corpus = results
    .map((r, i) => [`[${i + 1}] ${r.title}`, r.snippet, r.url].join("\n"))
    .join("\n\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM.replace("Search the web for CURRENT information on", "Using ONLY the web search results provided, describe") }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [`Business idea: ${JSON.stringify(text)}${gloss}`, `Location: ${place}`, "", "WEB SEARCH RESULTS:", corpus].join("\n"),
              },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 6000, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini research ${res.status}`);
  const cand = (await res.json()).candidates?.[0] ?? {};
  const body = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const sources = results.slice(0, 8).map((r) => ({ title: r.title || r.url, url: r.url }));
  return { body, sources };
}

/**
 * Preferred path: Gemini's built-in Google Search grounding. Gemini searches the live web
 * itself and returns the pages it used (groundingChunks), so no scraping is involved.
 */
async function groundedResearch(text, where, model, profile) {
  const place = where || "India";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      tools: [{ google_search: {} }],
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                `Business idea: ${JSON.stringify(text)}${profile?.summary ? ` (${profile.summary})` : ""}`,
                `Location: ${place}`,
                profile?.searchPhrase ? `Search for: ${profile.searchPhrase} in ${place}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 6000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini grounded ${res.status}`);
  const cand = (await res.json()).candidates?.[0] ?? {};
  const body = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const seen = new Set();
  const sources = (cand.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter((w) => w?.uri && !seen.has(w.uri) && seen.add(w.uri))
    .map((w) => ({ title: String(w.title || w.uri).slice(0, 120), url: w.uri }))
    .slice(0, 8);
  if (!sources.length) throw new Error("gemini grounded returned no sources");
  return { body, sources };
}

async function openRouterResearch(text, where) {
  const model = MODEL.endsWith(":online") ? MODEL : `${MODEL}:online`;
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
      "X-Title": "BizIntel",
    },
    signal: AbortSignal.timeout(75_000),
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Business idea: ${JSON.stringify(text)}
Location: ${where || "not specified (use India)"}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`research ${res.status}`);
  const msg = (await res.json()).choices?.[0]?.message ?? {};
  const seen = new Set();
  const sources = (msg.annotations ?? [])
    .map((a) => a?.url_citation)
    .filter((c) => c?.url && /^https?:\/\//.test(c.url) && !seen.has(c.url) && seen.add(c.url))
    .map((c) => ({ title: String(c.title || c.url).slice(0, 120), url: c.url }))
    .slice(0, 8);
  return { body: msg.content, sources };
}

/** Retry transient Gemini failures (429 rate limit / 5xx overload) with a short backoff. */
async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!/ (429|5\d\d)$|fetch failed|timed? ?out|aborted/i.test(e.message)) break;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

export async function researchIdea(idea, location) {
  const text = String(idea || "").trim();
  if (!text) return null;
  const viaGemini = Boolean(process.env.GEMINI_API_KEY);
  const viaOpenRouter = Boolean(process.env.OPENAI_API_KEY) && BASE_URL.includes("openrouter.ai");
  if (!viaGemini && !viaOpenRouter) {
    return {
      available: false,
      reason: "Live web research needs a GEMINI_API_KEY (Google AI Studio) or an OpenRouter key.",
    };
  }
  const where = String(location || "").trim();
  const key = `${text.toLowerCase()}|${where.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  // Understand what the idea actually is first, so the web search targets the right business.
  const profile = await understandIdea(text, undefined, "generic").catch(() => null);

  let body;
  let sources;
  if (viaGemini) {
    // Free tier only: never fall back to a paid provider when a Gemini key is set.
    // Same free tier, different models: when one is overloaded (503) the next usually answers.
    const models = [...new Set([GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash"])];
    let err;
    for (const mode of [groundedResearch, geminiResearch]) {
      for (const model of models) {
        try {
          ({ body, sources } = await withRetry(() => mode(text, where, model, profile), 2));
          err = null;
          break;
        } catch (e) {
          err = e;
          console.warn(`[research] ${mode.name} on ${model} failed: ${e.message}`);
        }
      }
      if (!err) break;
    }
    if (err) throw err;
  } else {
    ({ body, sources } = await openRouterResearch(text, where));
  }
  const m = String(body ?? "").match(/\{[\s\S]*\}/);
  if (!m) throw new Error("research returned no JSON");
  const raw = JSON.parse(m[0]);

  const value = {
    available: true,
    whatItIs: str(raw.whatItIs),
    marketSize: str(raw.marketSize),
    growth: str(raw.growth),
    trends: arr(raw.trends, 5),
    typicalInvestment: str(raw.typicalInvestment),
    leadingPlayers: arr(raw.leadingPlayers, 6),
    regulations: arr(raw.regulations, 4),
    opportunities: arr(raw.opportunities, 4),
    risks: arr(raw.risks, 4),
    sources,
    fetchedAt: new Date().toISOString(),
  };
  // Don't pin an empty result (search drifted / sources said nothing) for 12 hours.
  const empty = !value.marketSize && !value.leadingPlayers.length && !value.trends.length && !value.opportunities.length;
  if (!empty) cache.set(key, { value, exp: Date.now() + TTL_MS });
  return value;
}
