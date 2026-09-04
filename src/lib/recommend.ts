import { OPPORTUNITIES, type Opportunity } from "@/lib/mock-data";

export type RecommendInputs = {
  category?: string; // "" or "Any" = no preference
  budget?: string; // one of the BUDGET tiers
  experience?: string;
  timeline?: string;
  risk?: "Low" | "Balanced" | "High" | "";
  channel?: string; // Storefront / Online / Either
  city?: string;
  pincode?: string;
};

export type Recommendation = Opportunity & {
  fit: number; // 0-100 tailored score
  withinBudget: boolean;
  reasons: string[];
};

/** Rough upper bound (USD) each budget tier can cover, for the demo dataset. */
const BUDGET_CEILING: Record<string, number> = {
  "Under ₹1 Lakh": 15_000,
  "₹1–5 Lakhs": 60_000,
  "₹5–25 Lakhs": 120_000,
  "₹25 Lakhs–1 Crore": 260_000,
  "Above ₹1 Crore": Number.POSITIVE_INFINITY,
};

export function recommendIdeas(input: RecommendInputs): Recommendation[] {
  const ceiling = input.budget ? (BUDGET_CEILING[input.budget] ?? Infinity) : Infinity;
  const wantsCategory = input.category && input.category !== "Any" ? input.category : null;

  const scored = OPPORTUNITIES.map((o): Recommendation => {
    let fit = o.score;
    const reasons: string[] = [];

    if (wantsCategory && o.category === wantsCategory) {
      fit += 12;
      reasons.push(`Matches your ${o.category} focus`);
    } else if (!wantsCategory) {
      reasons.push(`Strong ${o.category} opportunity in your area`);
    }

    const withinBudget = o.investmentMin <= ceiling;
    if (input.budget) {
      if (withinBudget && o.investmentMax <= ceiling) {
        fit += 8;
        reasons.push("Fits comfortably within your budget");
      } else if (withinBudget) {
        fit += 2;
        reasons.push("Reachable near the top of your budget");
      } else {
        fit -= 14;
        reasons.push("Above your stated budget — plan for funding");
      }
    }

    if (input.risk === "Low") {
      fit += (100 - o.competition) / 8;
      if (o.confidence === "High") {
        fit += 5;
        reasons.push("High-confidence, lower-competition pick");
      }
    } else if (input.risk === "High") {
      fit += o.demand / 8;
      reasons.push("High demand upside");
    }

    if (input.experience === "No experience" && o.breakEvenMonths <= 16) {
      fit += 4;
      reasons.push("Faster break-even — friendlier for a first venture");
    }

    if (input.timeline === "Immediately" && o.breakEvenMonths <= 18) {
      fit += 3;
    }

    return {
      ...o,
      fit: Math.max(0, Math.min(100, Math.round(fit))),
      withinBudget,
      reasons: reasons.slice(0, 3),
    };
  });

  return scored.sort((a, b) => b.fit - a.fit).slice(0, 4);
}
