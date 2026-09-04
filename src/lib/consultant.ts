import { OPPORTUNITIES } from "@/lib/mock-data";
import type { User } from "@/lib/auth";

const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:4000";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type ConsultantReply = { text: string; provider: string; warning?: string };

/** Compact context sent to the backend so the model can cite real numbers. */
export function buildContext(user: User | null) {
  return {
    mode: user?.mode ?? null,
    idea: user?.idea ?? null,
    category: user?.industry ?? null,
    budget: user?.budget ?? null,
    city: user?.city ?? null,
    pincode: user?.pincode ?? null,
    opportunities: OPPORTUNITIES.map((o) => ({
      name: o.name,
      category: o.category,
      score: o.score,
      demand: o.demand,
      competition: o.competition,
      investmentMin: o.investmentMin,
      investmentMax: o.investmentMax,
      breakEvenMonths: o.breakEvenMonths,
      rationale: o.rationale,
      risks: o.risks,
    })),
  };
}

type Ctx = ReturnType<typeof buildContext>;

/** Runs only when the backend can't be reached — keeps the consultant usable offline. */
function offlineAnswer(question: string, ctx: Ctx): string {
  const q = question.toLowerCase();
  const opps = ctx.opportunities;
  const ranked = [...opps].sort((a, b) => b.score - a.score);
  const focus =
    opps.find((o) => q.includes(o.name.toLowerCase().split(" ")[0])) ||
    (ctx.category ? opps.find((o) => o.category === ctx.category) : undefined) ||
    ranked[0];
  if (!focus) return "Run a New Analysis for your location and I'll walk through the results.";
  const money = (n: number) => `$${n.toLocaleString()}`;
  const where = [ctx.city, ctx.pincode].filter(Boolean).join(" ") || "your market";
  const head = `For ${focus.name} (${focus.category}) in ${where}: score ${focus.score}/100, demand ${focus.demand}, competition ${focus.competition}, break-even ${focus.breakEvenMonths} months.`;

  let body: string;
  if (/risk|downside|threat/.test(q)) {
    body = `Key risks: ${focus.risks.join("; ") || "none flagged"}. Competition index ${focus.competition} — ${focus.competition > 55 ? "differentiation is essential" : "the field is fairly open"}.`;
  } else if (/budget|invest|capital|afford|cost/.test(q)) {
    body = `Estimated investment ${money(focus.investmentMin)}–${money(focus.investmentMax)}. Your budget: ${ctx.budget || "not set"}.`;
  } else if (/compare|versus|\bvs\b/.test(q) && ranked.length > 1) {
    const [a, b] = ranked;
    body = `${a.name} (${a.score}) vs ${b.name} (${b.score}) — ${a.name} leads on the blended demand-vs-competition signal.`;
  } else if (/competitor|competition|rival|saturat/.test(q)) {
    body = `Competition index ${focus.competition}: ${focus.competition <= 40 ? "under-served" : focus.competition <= 60 ? "moderately contested — bring a clear wedge" : "crowded — enter only with a distinct concept"}.`;
  } else if (/report|summary|investor|plan/.test(q)) {
    body = `Headline: score ${focus.score}, demand ${focus.demand}, competition ${focus.competition}, investment ${money(focus.investmentMin)}–${money(focus.investmentMax)}. Open Projects & Reports for the full consolidated report.`;
  } else {
    body = `${focus.rationale} Next step: pull the full analysis and shortlist two sites.`;
  }
  return `${head}\n\n${body}\n\n_(offline mode — start the backend for full AI answers)_`;
}

export async function askConsultant(messages: ChatMsg[], ctx: Ctx): Promise<ConsultantReply> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  try {
    const res = await fetch(`${API_URL}/api/consultant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, context: ctx }),
    });
    if (!res.ok) throw new Error(`consultant ${res.status}`);
    const data = (await res.json()) as ConsultantReply;
    if (!data.text) throw new Error("empty reply");
    return data;
  } catch {
    return { text: offlineAnswer(lastUser, ctx), provider: "offline" };
  }
}
