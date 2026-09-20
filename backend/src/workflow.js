/**
 * The end-to-end analysis for one idea at one location, run as an ordered pipeline:
 *   1. understand  — LLM + Wikipedia work out what the idea actually is
 *   2. location    — real nearby competitors and neighbourhood signals (Geoapify / OpenStreetMap)
 *   3. research    — live web research: market size, players, regulations, opportunities
 * Step 1 feeds the others (they all resolve the same interpreted idea). Steps 2 and 3 are
 * independent, so they run in parallel and one failing never blocks the rest.
 */
import { analyzeIdea, nearby, siteScore } from "./geo.js";
import { researchIdea } from "./research.js";

async function step(fn) {
  const t0 = Date.now();
  try {
    return { status: "ok", ms: Date.now() - t0, data: await fn() };
  } catch (e) {
    return { status: "error", ms: Date.now() - t0, error: e.message };
  }
}

export async function runWorkflow({ name, category, lat, lng, location, demand, competition }) {
  const idea = String(name || "").trim();
  const hasPin = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== null && lng !== null;

  const understand = await step(() => analyzeIdea({ name: idea, category }));

  const [competitors, market, research] = await Promise.all([
    hasPin ? step(() => nearby({ lat, lng, name: idea, category })) : { status: "skipped", reason: "no location pin" },
    hasPin
      ? step(() => siteScore({ lat, lng, name: idea, category, demand, competition }))
      : { status: "skipped", reason: "no location pin" },
    step(() => researchIdea(idea, location)),
  ]);

  return { idea, location: location || null, steps: { understand, competitors, market, research } };
}
