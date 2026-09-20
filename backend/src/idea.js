/**
 * Idea understanding. Before any location lookup we work out what the user's free-text
 * idea actually IS: an LLM (when a key is configured) interprets it into a business
 * profile + the OpenStreetMap / Geoapify categories that real competitors live under,
 * and Wikipedia is consulted for a factual description of that business type.
 * Without an LLM key it falls back to the keyword rules in geo.js (and still fetches
 * the Wikipedia context). Results are cached per idea.
 */

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export const KEYWORDS = [
  "coffee", "bakery", "wine", "bar", "restaurant", "fitness", "pet", "beauty", "medical",
  "carwash", "automotive", "services", "professional", "entertainment", "retail", "tech",
  "education", "hospitality", "generic",
];
export const APP_CATEGORIES = [
  "Food & Beverage", "Health & Wellness", "Consumer Services", "Retail", "Technology",
  "Education", "Hospitality", "Other",
];
const OSM_KEYS = new Set(["amenity", "shop", "craft", "office", "leisure", "healthcare", "tourism"]);
const SAFE_VALUE = /^[a-z_]{2,40}$/;
const SAFE_GEO_CAT = /^[a-z_]+(\.[a-z_]+)*$/;

const cache = new Map(); // "idea|category" -> { value, exp }
const TTL_MS = 24 * 60 * 60 * 1000;

const SYSTEM = `You interpret a business idea typed by an entrepreneur so a map-data tool can find the RIGHT nearby competitors.
Reply with ONLY a JSON object, no prose, with these fields:
{
 "businessType": short canonical name of the business (e.g. "car wash", "cloud kitchen"),
 "summary": 1-2 sentences: what this business is and how it makes money,
 "searchPhrase": 3-6 word web-search phrase that names the industry unambiguously so a search engine doesn't confuse it with something else (e.g. "cloud kitchen food delivery restaurant business", not just "cloud kitchen"),
 "customers": array of 2-4 target customer segments,
 "competitorTerms": array of 3-6 names/terms that describe direct competitors,
 "category": one of ${JSON.stringify(APP_CATEGORIES)},
 "keyword": the closest of ${JSON.stringify(KEYWORDS)}, or "custom" if none is a precise fit,
 "geoapifyCategories": array of Geoapify Places categories where direct competitors are listed (e.g. "service.vehicle.car_wash"), only if keyword is "custom",
 "osmTags": array of {"key": one of amenity|shop|craft|office|leisure|healthcare|tourism, "values": [OSM tag values]} where direct competitors are mapped, only if keyword is "custom"
}
"professional" means ONLY law firms, accountants, real estate agents, insurance brokers and consultancies. "tech" means IT / software / electronics businesses (an IT or software startup or company is "tech"). If the idea is vague (e.g. "startup company"), interpret it as the most likely concrete business: a small software/IT company.
Valid Geoapify categories for custom searches include: office.it, office.company, office.research, office.coworking, commercial.elektronics, education.school, education.college, service.financial.bank; never invent category names.
Pick "custom" only when no listed keyword precisely matches the business. Direct competitors only, never merely nearby businesses.`;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

// Same free tier, other models: when one is overloaded (503) the next usually answers.
const GEMINI_MODELS = [...new Set([GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash"])];

async function geminiText(user) {
  let last;
  for (let i = 0; i < 4; i++) {
    if (i) await new Promise((r) => setTimeout(r, 1000 * i));
    const model = GEMINI_MODELS[i % GEMINI_MODELS.length];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
      },
    );
    if (res.ok) {
      return ((await res.json()).candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    }
    last = new Error(`Gemini ${res.status}`);
    if (res.status !== 429 && res.status !== 404 && res.status < 500) break; // only retry throttling / overload
  }
  throw last;
}

async function llmJson(idea) {
  const user = `Business idea: ${JSON.stringify(idea)}`;
  let text = "";
  if (process.env.GEMINI_API_KEY) {
    try {
      text = await geminiText(user);
    } catch (e) {
      // Free tier only: don't fall through to a paid provider; callers fall back to rules.
      throw e;
    }
  }
  if (text) {
    // answered by Gemini
  } else if (process.env.OPENAI_API_KEY) {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 700,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    text = (await res.json()).choices?.[0]?.message?.content ?? "";
  } else if (process.env.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    text = ((await res.json()).content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  } else {
    return null;
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("LLM returned no JSON");
  return JSON.parse(m[0]);
}

const strArr = (v, max) =>
  (Array.isArray(v) ? v : [])
    .filter((s) => typeof s === "string" && s.trim())
    .map((s) => s.trim().slice(0, 80))
    .slice(0, max);

/** Validate/whitelist everything the LLM returned before it reaches an upstream query. */
function sanitize(raw) {
  const keyword = KEYWORDS.includes(raw.keyword) || raw.keyword === "custom" ? raw.keyword : "generic";
  const out = {
    businessType: String(raw.businessType || "").slice(0, 80),
    summary: String(raw.summary || "").slice(0, 400),
    searchPhrase: String(raw.searchPhrase || "").replace(/["\r\n]/g, " ").trim().slice(0, 80),
    customers: strArr(raw.customers, 4),
    competitorTerms: strArr(raw.competitorTerms, 6),
    category: APP_CATEGORIES.includes(raw.category) ? raw.category : null,
    keyword,
    geoapifyCategories: strArr(raw.geoapifyCategories, 6).filter((c) => SAFE_GEO_CAT.test(c)),
    selectors: (Array.isArray(raw.osmTags) ? raw.osmTags : [])
      .filter((t) => t && OSM_KEYS.has(t.key) && Array.isArray(t.values))
      .map((t) => ({
        key: t.key,
        values: t.values.filter((v) => typeof v === "string" && SAFE_VALUE.test(v)).slice(0, 12),
      }))
      .filter((t) => t.values.length)
      .slice(0, 5)
      .map((t) => `["${t.key}"~"^(${t.values.join("|")})$"]`),
  };
  // "custom" is only usable when it carries something to search for.
  if (out.keyword === "custom" && !out.geoapifyCategories.length && !out.selectors.length) {
    out.keyword = "generic";
  }
  return out;
}

async function wikiContext(term) {
  if (!term) return null;
  const headers = { "User-Agent": "BizIntel/1.0" };
  try {
    const s = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(term)}`,
      { signal: AbortSignal.timeout(6_000), headers },
    );
    const title = (await s.json()).query?.search?.[0]?.title;
    if (!title) return null;
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(6_000),
      headers,
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.extract) return null;
    return { title: j.title, extract: j.extract.slice(0, 600), url: j.content_urls?.desktop?.page ?? null };
  } catch {
    return null;
  }
}

/**
 * -> { keyword, category, businessType, summary, customers, competitorTerms,
 *      geoapifyCategories, selectors, wiki, source: "llm" | "rules" }
 * `fallbackKeyword` is geo.js's rule-based guess, used when there's no LLM (or it fails).
 */
export async function understandIdea(idea, category, fallbackKeyword) {
  const text = String(idea || "").trim();
  if (!text) return { keyword: fallbackKeyword, category: category || null, geoapifyCategories: [], selectors: [], source: "rules" };
  const key = `${text.toLowerCase()}|${category || ""}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  let profile = null;
  try {
    const raw = await llmJson(text);
    if (raw) profile = { ...sanitize(raw), source: "llm" };
  } catch (e) {
    console.warn(`[idea] LLM understanding failed, using rules: ${e.message}`);
  }
  if (!profile) {
    profile = {
      keyword: fallbackKeyword,
      category: category || null,
      businessType: text,
      summary: "",
      customers: [],
      competitorTerms: [],
      geoapifyCategories: [],
      selectors: [],
      source: "rules",
    };
  }
  profile.wiki = await wikiContext(profile.businessType || text);
  // Don't pin a keyless/failed result for a day — a key may be added shortly.
  cache.set(key, { value: profile, exp: Date.now() + (profile.source === "llm" ? TTL_MS : 5 * 60_000) });
  return profile;
}
