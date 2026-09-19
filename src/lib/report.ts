import {
  OPPORTUNITIES,
  REVENUE_FORECAST,
  SAVED_PROJECTS,
  type Competitor,
  type Opportunity,
} from "@/lib/mock-data";
import { getProject } from "@/lib/projects";
import { fetchNearby } from "@/lib/geo";
import {
  competitorsFor,
  demandTimeseries,
  demographics,
  insightsFor,
  resolveFocusOpportunity,
  siteScore,
} from "@/lib/opportunity-insights";

export type ProjectReport = {
  project: {
    id: string;
    title: string;
    location: string;
    businessType: string;
    status: string;
    score: number;
  };
  opportunity: Opportunity;
  generatedAt: string;
  demographics: { label: string; value: string }[];
  demand: { month: string; demand: number; competition: number }[];
  competitors: Competitor[];
  siteScore: { label: string; value: number }[];
  forecast: { month: string; revenue: number; cost: number }[];
  insights: { tag: string; title: string; body: string }[];
};

type ReportBase = {
  id: string;
  title: string;
  location: string;
  businessType: string;
  status: string;
  opportunity: Opportunity;
  lat?: number;
  lng?: number;
};

/** Real nearby businesses from OpenStreetMap when we have coordinates; the modeled
 *  estimate otherwise (no site pinned, or the lookup failed/found nothing). */
async function competitorsForReport(o: Opportunity, lat?: number, lng?: number): Promise<Competitor[]> {
  if (typeof lat === "number" && typeof lng === "number") {
    try {
      const live = await fetchNearby({ lat, lng, category: o.category, name: o.name });
      if (live.competitors.length) {
        return live.competitors.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.kind,
          distanceMi: c.distanceMi,
          lat: c.lat,
          lng: c.lng,
          info: c.info,
        }));
      }
    } catch {
      /* backend unreachable — fall back to the estimate below */
    }
  }
  return competitorsFor(o);
}

/**
 * Assemble the full consolidated report from a single focused opportunity, using
 * the exact same derivations the Market / Competitors / Location / Insights tabs
 * render — so the downloaded report always matches what's on screen.
 */
async function assemble(base: ReportBase): Promise<ProjectReport> {
  const o = base.opportunity;
  const site = siteScore(o);
  return {
    project: {
      id: base.id,
      title: base.title,
      location: base.location,
      businessType: base.businessType,
      status: base.status,
      score: o.score,
    },
    opportunity: o,
    generatedAt: new Date().toISOString().slice(0, 10),
    demographics: demographics(o),
    demand: demandTimeseries(o),
    competitors: await competitorsForReport(o, base.lat, base.lng),
    siteScore: site.rows.map((r) => ({ label: r.l, value: r.v })),
    forecast: REVENUE_FORECAST,
    insights: insightsFor(o).map((i) => ({ tag: i.tag, title: i.title, body: i.body })),
  };
}

/** Pick the opportunity whose score is closest to a demo project's score. */
function matchOpportunity(score: number): Opportunity {
  return [...OPPORTUNITIES].sort(
    (a, b) => Math.abs(a.score - score) - Math.abs(b.score - score),
  )[0];
}

/** Resolve `/projects/$id` — a real saved project first, then the demo set. */
export async function getProjectReport(id: string): Promise<ProjectReport | null> {
  const real = getProject(id);
  if (real) {
    return assemble({
      id: real.id,
      title: real.title,
      location: real.location,
      businessType: real.businessType,
      status: real.status,
      opportunity: resolveFocusOpportunity({
        focusOpportunityId: real.focusOpportunityId,
        industry: real.category,
        idea: real.businessType,
        ownIdea: true,
      }),
      lat: real.lat,
      lng: real.lng,
    });
  }
  const demo = SAVED_PROJECTS.find((p) => p.id === id);
  if (!demo) return null;
  return assemble({
    id: demo.id,
    title: demo.title,
    location: demo.location,
    businessType: demo.businessType,
    status: demo.status,
    opportunity: matchOpportunity(demo.score),
  });
}

/** Build a consolidated report on the fly (no saved project needed). */
export async function adHocReport(input: {
  opportunity: Opportunity;
  title: string;
  location: string;
  businessType: string;
  lat?: number;
  lng?: number;
}): Promise<ProjectReport> {
  return assemble({
    id: "adhoc",
    title: input.title,
    location: input.location,
    businessType: input.businessType,
    status: "Complete",
    opportunity: input.opportunity,
    lat: input.lat,
    lng: input.lng,
  });
}

const money = (n: number) => `$${n.toLocaleString()}`;

/** A self-contained HTML document with every section — used for the "Download" action. */
export function buildReportHtml(r: ProjectReport): string {
  const { project: p, opportunity: o } = r;
  const rows = (cells: (string | number)[][]) =>
    cells.map((c) => `<tr>${c.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${p.title} — BizIntel report</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font: 14px/1.6 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14213d; margin: 0; padding: 40px; background: #fff; }
  .wrap { max-width: 820px; margin: 0 auto; }
  header { border-bottom: 3px solid #4a7fe3; padding-bottom: 16px; margin-bottom: 28px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 32px 0 10px; color: #4a7fe3; text-transform: uppercase; letter-spacing: .06em; }
  .meta { color: #5b6472; font-size: 13px; }
  .score { display: inline-block; font-size: 40px; font-weight: 800; color: #00a58f; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e9f2; }
  th { background: #f5f7fb; font-weight: 600; }
  ul { margin: 8px 0; padding-left: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
  .cell { border: 1px solid #e5e9f2; border-radius: 8px; padding: 10px; }
  .cell b { display: block; font-size: 16px; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e9f2; color: #9aa3b2; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${p.title}</h1>
    <p class="meta">${p.location} &bull; ${p.businessType} &bull; Report generated ${r.generatedAt}</p>
    <p><span class="score">${p.score}</span> <span class="meta">/ 100 opportunity score &bull; ${o.confidence} confidence &bull; status: ${p.status}</span></p>
  </header>

  <h2>Executive summary</h2>
  <p>${o.rationale}</p>
  <div class="grid">
    <div class="cell"><span class="meta">Demand index</span><b>${o.demand}</b></div>
    <div class="cell"><span class="meta">Competition index</span><b>${o.competition}</b></div>
    <div class="cell"><span class="meta">Break-even</span><b>${o.breakEvenMonths} mo</b></div>
  </div>
  <p class="meta" style="margin-top:10px">Estimated investment: <b>${money(o.investmentMin)}–${money(o.investmentMax)}</b></p>

  <h2>Market analysis</h2>
  <div class="grid">
    ${r.demographics.map((d) => `<div class="cell"><span class="meta">${d.label}</span><b>${d.value}</b></div>`).join("")}
  </div>
  <table>
    <thead><tr><th>Month</th><th>Demand</th><th>Competition</th></tr></thead>
    <tbody>${rows(r.demand.map((d) => [d.month, d.demand, d.competition]))}</tbody>
  </table>

  <h2>Competitor analysis</h2>
  <table>
    <thead><tr><th>Name</th><th>Category</th><th>Distance (mi)</th><th>Detail</th></tr></thead>
    <tbody>${rows(
      r.competitors.map((c) => [
        c.name,
        c.category,
        c.distanceMi,
        c.rating != null ? `${c.rating} ★ (${c.reviews} reviews)` : c.info || "—",
      ]),
    )}</tbody>
  </table>

  <h2>Location intelligence</h2>
  <table>
    <thead><tr><th>Factor</th><th>Score</th></tr></thead>
    <tbody>${rows(r.siteScore.map((s) => [s.label, s.value]))}</tbody>
  </table>

  <h2>Financial forecast</h2>
  <table>
    <thead><tr><th>Month</th><th>Revenue</th><th>Cost</th></tr></thead>
    <tbody>${rows(r.forecast.map((f) => [f.month, money(f.revenue), money(f.cost)]))}</tbody>
  </table>

  <h2>Insights &amp; recommendations</h2>
  <ul>${r.insights.map((i) => `<li><b>${i.title}</b> — ${i.body}</li>`).join("")}</ul>

  <h2>Key risks</h2>
  <ul>${o.risks.map((risk) => `<li>${risk}</li>`).join("")}</ul>

  <footer>Generated by BizIntel &bull; ${r.generatedAt} &bull; This report consolidates market, competitor, location, financial and insight analysis for ${p.title}.</footer>
</div>
</body>
</html>`;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "bizintel";

/** Build the consolidated report as one HTML file and trigger a browser download. */
export function downloadReport(r: ProjectReport) {
  triggerDownload(buildReportHtml(r), `${slug(r.project.title)}-bizintel-report.html`);
}

function triggerDownload(html: string, filename: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- single-opportunity export ----------------------------------------
/** Standalone HTML for one opportunity (used by the Download button on the Opportunities page). */
export function buildOpportunityHtml(o: Opportunity): string {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const rows = (cells: (string | number)[][]) =>
    cells.map((c) => `<tr>${c.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${o.name} — BizIntel opportunity</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.6 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14213d; margin: 0; padding: 40px; background: #fff; }
  .wrap { max-width: 760px; margin: 0 auto; }
  header { border-bottom: 3px solid #4a7fe3; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; color: #4a7fe3; text-transform: uppercase; letter-spacing: .06em; }
  .meta { color: #5b6472; font-size: 13px; }
  .score { font-size: 40px; font-weight: 800; color: #00a58f; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
  .cell { border: 1px solid #e5e9f2; border-radius: 8px; padding: 10px; }
  .cell b { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e9f2; }
  th { background: #f5f7fb; font-weight: 600; }
  ul { margin: 8px 0; padding-left: 20px; }
  footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e9f2; color: #9aa3b2; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${o.name}</h1>
    <p class="meta">${o.category} &bull; ${o.confidence} confidence &bull; ${o.tags.join(", ")} &bull; generated ${generatedAt}</p>
    <p><span class="score">${o.score}</span> <span class="meta">/ 100 opportunity score</span></p>
  </header>

  <h2>Why it scored</h2>
  <p>${o.rationale}</p>

  <h2>Signals</h2>
  <div class="grid">
    <div class="cell"><span class="meta">Demand</span><b>${o.demand}</b></div>
    <div class="cell"><span class="meta">Competition</span><b>${o.competition}</b></div>
    <div class="cell"><span class="meta">Break-even</span><b>${o.breakEvenMonths} mo</b></div>
  </div>
  <p class="meta" style="margin-top:10px">Estimated investment: <b>$${o.investmentMin.toLocaleString()}–$${o.investmentMax.toLocaleString()}</b></p>

  <h2>Revenue forecast</h2>
  <table>
    <thead><tr><th>Month</th><th>Revenue</th><th>Cost</th></tr></thead>
    <tbody>${rows(REVENUE_FORECAST.map((f) => [f.month, `$${f.revenue.toLocaleString()}`, `$${f.cost.toLocaleString()}`]))}</tbody>
  </table>

  <h2>Key risks</h2>
  <ul>${o.risks.map((r) => `<li>${r}</li>`).join("")}</ul>

  <footer>Generated by BizIntel &bull; ${generatedAt}</footer>
</div>
</body>
</html>`;
}

export function downloadOpportunity(o: Opportunity) {
  triggerDownload(buildOpportunityHtml(o), `${slug(o.name)}-opportunity.html`);
}
