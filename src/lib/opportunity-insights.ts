import { OPPORTUNITIES, type Competitor, type Opportunity } from "@/lib/mock-data";

/**
 * Everything the Opportunities tabs (Market / Competitors / Location / Insights)
 * render is derived here from a SINGLE focused opportunity, so the whole section
 * reflects the idea the user picked in the dashboard / setup — nothing generic.
 */

/** Deterministic 0..1 generator seeded by a string, so a given idea always looks the same. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clamp = (n: number) => Math.round(Math.max(5, Math.min(100, n)));

/** Best-guess reference opportunity + category for a free-text business idea. */
export function classifyIdea(text: string): { oppId: string; category: string } {
  const t = text.toLowerCase();
  if (/educat|school|tuition|tutor|coaching|academy|institute|classes|training|learning|teach|course|kindergarten|preschool|study/.test(t))
    return { oppId: "opp-6", category: "Education" };
  if (/gym|fitness|yoga|pilates|\bspa\b|sal+o+n|parlou?r|beauty|nail|barber|wellness|studio|clinic|therapy|dental|physio/.test(t))
    return { oppId: "opp-2", category: "Health & Wellness" };
  if (/\bpets?\b|\bdogs?\b|\bcats?\b|\bvet\b|groom|daycare|laundry|dry clean|repair|cleaning|tailor|barber|courier/.test(t))
    return { oppId: "opp-4", category: "Consumer Services" };
  if (/wine|\bbar\b|\bpub\b|brew|liquor/.test(t)) return { oppId: "opp-3", category: "Food & Beverage" };
  if (/poke|bowl|salad|fast.?casual|quick.?service/.test(t))
    return { oppId: "opp-5", category: "Food & Beverage" };
  if (/software|\bit\b|computer|electronics|mobile|gadget|app\b|tech/.test(t))
    return { oppId: "opp-1", category: "Technology" };
  if (/shop|store|boutique|retail|mart|showroom|clothing|garment|supermarket/.test(t))
    return { oppId: "opp-1", category: "Retail" };
  if (/hotel|resort|lodge|homestay|hostel|guest ?house/.test(t))
    return { oppId: "opp-1", category: "Hospitality" };
  return { oppId: "opp-1", category: "Other" };
}

/**
 * The one idea this whole section is about. For the user's own idea the name and
 * category come from what they typed, so live competitor / location / market lookups
 * search for THAT business — the base opportunity only supplies modeled numbers.
 */
export function resolveFocusOpportunity(opts: {
  focusOpportunityId?: string;
  industry?: string;
  idea?: string;
  ownIdea?: boolean;
}): Opportunity {
  const idea = opts.idea?.trim();
  if (opts.ownIdea && idea) {
    const { oppId, category } = classifyIdea(idea);
    const base = OPPORTUNITIES.find((o) => o.id === oppId) ?? OPPORTUNITIES[0];
    const exact = false;
    return {
      ...base,
      name: idea,
      category,
      rationale: exact
        ? base.rationale
        : `Modeled from typical ${category} benchmarks. The competitor, location and market figures for your pincode are live data.`,
      risks: exact ? base.risks : ["Local competition intensity", "Lease and fit-out costs"],
    };
  }
  const byId = opts.focusOpportunityId
    ? OPPORTUNITIES.find((o) => o.id === opts.focusOpportunityId)
    : undefined;
  const byCategory = opts.industry
    ? [...OPPORTUNITIES]
        .filter((o) => o.category === opts.industry)
        .sort((a, b) => b.score - a.score)[0]
    : undefined;
  return byId ?? byCategory ?? [...OPPORTUNITIES].sort((a, b) => b.score - a.score)[0];
}

/** 12-month demand vs competition trend, ramped and wobbled around the idea's own numbers. */
export function demandTimeseries(o: Opportunity) {
  const rnd = seeded(o.id + ":demand");
  return MONTHS.map((month, i) => {
    const t = i / 11;
    return {
      month,
      demand: clamp(o.demand * (0.78 + 0.34 * t) + (rnd() - 0.5) * 8),
      competition: clamp(o.competition * (0.9 + 0.22 * t) + (rnd() - 0.5) * 5),
    };
  });
}

/** Neighbourhood demographics tuned so each idea reads differently. */
export function demographics(o: Opportunity) {
  const rnd = seeded(o.id + ":demo");
  return [
    { label: "Median age", value: `${28 + Math.round(rnd() * 14)}` },
    { label: "Median HH income", value: `$${70 + Math.round(rnd() * 60)}k` },
    { label: "Population (1mi)", value: `${12 + Math.round(rnd() * 12)},${200 + Math.round(rnd() * 799)}` },
    { label: "Daytime workers", value: `${4 + Math.round(rnd() * 5)},${100 + Math.round(rnd() * 899)}` },
    { label: "Renter households", value: `${45 + Math.round(rnd() * 25)}%` },
    { label: "College degree+", value: `${55 + Math.round(rnd() * 25)}%` },
  ];
}

const COMPETITOR_POOL: Record<string, string[]> = {
  "Food & Beverage": [
    "Corner Roasters",
    "Miller's Bakehouse",
    "The Tasting Room",
    "Harbor Kitchen",
    "Daily Grind Co.",
    "Vine & Board",
    "Riverside Cafe",
    "Copper Pot Eatery",
  ],
  "Health & Wellness": [
    "Core Collective",
    "Balance Studio",
    "Pulse Fitness",
    "Still Point Pilates",
    "The Movement Lab",
    "Anchor Wellness",
    "Form & Flow",
  ],
  "Consumer Services": [
    "Bright & Tidy",
    "PawPals Care",
    "QuickFix Services",
    "Neighbourhood Groomers",
    "The Care Company",
    "HomeHelp Local",
  ],
};
const EDU_POOL = [
  "Bright Minds Academy",
  "Scholars Coaching Institute",
  "Learn Hub",
  "Toppers Tutorial",
  "Wisdom Learning Center",
  "Alpha Study Circle",
];

const GENERIC_POOL = Array.from({ length: 8 }, (_, i) => `Local operator ${i + 1}`);

/** Nearby competitors — more of them, and closer, when the idea's competition score is high. */
export function competitorsFor(o: Opportunity): Competitor[] {
  const rnd = seeded(o.id + ":comp");
  const pool = o.category === "Education" ? EDU_POOL : (COMPETITOR_POOL[o.category] ?? GENERIC_POOL);
  const count = Math.max(2, Math.min(pool.length, Math.round(2 + (o.competition / 100) * 5)));
  return Array.from({ length: count }, (_, i) => ({
    id: `${o.id}-c${i + 1}`,
    name: pool[i],
    category: o.category,
    distanceMi: +(0.2 + rnd() * 1.3).toFixed(1),
    rating: +(3.8 + rnd() * 1.1).toFixed(1),
    reviews: 120 + Math.round(rnd() * 1400),
    priceLevel: ((1 + Math.round(rnd() * 2)) as Competitor["priceLevel"]),
    lat: 47.65 + (rnd() - 0.5) * 0.03,
    lng: -122.35 + (rnd() - 0.5) * 0.03,
  })).sort((a, b) => a.distanceMi - b.distanceMi);
}

/** Site score breakdown, computed straight from the idea's demand / competition / score. */
export function siteScore(o: Opportunity) {
  const footTraffic = clamp(o.demand + 6);
  const demandMatch = clamp(o.demand);
  const competitionHeadroom = clamp(100 - o.competition);
  const accessibility = clamp(60 + (o.score - 58) * 0.6);
  return {
    overall: Math.round((footTraffic + demandMatch + competitionHeadroom + accessibility) / 4),
    rows: [
      { l: "Foot traffic", v: footTraffic },
      { l: "Demand match", v: demandMatch },
      { l: "Competition headroom", v: competitionHeadroom },
      { l: "Accessibility", v: accessibility },
    ],
  };
}

export type IdeaInsight = {
  kind: "score" | "trend" | "reco" | "risk" | "info";
  tag: string;
  title: string;
  body: string;
};

/** Insight cards written from the focused idea's own rationale, risks and numbers. */
export function insightsFor(o: Opportunity): IdeaInsight[] {
  const out: IdeaInsight[] = [
    {
      kind: "score",
      tag: `Score ${o.score}`,
      title: `${o.name} — ${o.confidence.toLowerCase()} confidence`,
      body: o.rationale,
    },
    {
      kind: "trend",
      tag: "Demand",
      title: `Demand index ${o.demand} / 100`,
      body:
        o.demand >= 70
          ? "Above-market demand for this category in the area — search intent and foot traffic both trend up."
          : "Moderate demand — run a location test before committing capital.",
    },
    {
      kind: "reco",
      tag: "Competition",
      title: `Competition pressure ${o.competition} / 100`,
      body:
        o.competition <= 45
          ? "Relatively under-served — you can enter without heavy differentiation."
          : "Crowded nearby — you'll need a clear wedge on product, price or experience.",
    },
    ...o.risks.map((r): IdeaInsight => ({
      kind: "risk",
      tag: "Risk",
      title: r,
      body: "Flagged as a key risk for this idea — build a mitigation into your plan.",
    })),
    {
      kind: "info",
      tag: "Payback",
      title: `Break-even ~${o.breakEvenMonths} months`,
      body: `Estimated investment $${o.investmentMin.toLocaleString()}–$${o.investmentMax.toLocaleString()}.`,
    },
  ];
  return out;
}
