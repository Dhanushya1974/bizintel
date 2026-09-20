import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Info, Lightbulb, Loader2, MinusCircle, Sparkles, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { runIdeaWorkflow, type IdeaWorkflow } from "@/lib/geo";
import { insightsFor, type IdeaInsight } from "@/lib/opportunity-insights";

const ICON: Record<IdeaInsight["kind"], typeof TrendingUp> = {
  score: Sparkles,
  trend: TrendingUp,
  reco: BarChart3,
  risk: AlertTriangle,
  info: Info,
};

export function InsightsPanel({ opportunity, location }: { opportunity: Opportunity; location?: string }) {
  const insights = insightsFor(opportunity);
  const { user } = useAuth();
  const lat = user?.siteLat ?? user?.geoLat;
  const lng = user?.siteLng ?? user?.geoLng;
  const [flow, setFlow] = useState<IdeaWorkflow | null>(null);
  const [flowState, setFlowState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    let alive = true;
    setFlow(null);
    setFlowState("loading");
    runIdeaWorkflow({
      name: opportunity.name,
      category: opportunity.category,
      location,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    })
      .then((r) => {
        if (!alive) return;
        setFlow(r);
        setFlowState("done");
      })
      .catch(() => alive && setFlowState("error"));
    return () => {
      alive = false;
    };
  }, [opportunity.name, opportunity.category, location, lat, lng]);
  const profile = flow?.steps.understand.status === "ok" ? flow.steps.understand.data : null;
  const research = flow?.steps.research.status === "ok" ? flow.steps.research.data : null;
  const researchState: "loading" | "done" | "error" =
    flowState === "loading" ? "loading" : flow?.steps.research.status === "ok" ? "done" : "error";
  const stepLine = (label: string, s: IdeaWorkflow["steps"][keyof IdeaWorkflow["steps"]] | undefined, detail?: string) => (
    <li className="flex items-center gap-2 text-sm">
      {!s ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : s.status === "ok" ? (
        <CheckCircle2 className="h-4 w-4 text-[color:var(--color-teal)]" />
      ) : s.status === "skipped" ? (
        <MinusCircle className="h-4 w-4 text-muted-foreground" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">
        {!s ? "working…" : s.status === "ok" ? detail : s.status === "skipped" ? s.reason : s.error}
      </span>
    </li>
  );
  const list = (title: string, items?: string[]) =>
    items && items.length > 0 ? (
      <div>
        <p className="text-sm font-medium">{title}</p>
        <ul className="ml-4 list-disc text-sm text-muted-foreground">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="font-semibold">Analysis workflow</p>
          <ol className="space-y-1.5">
            {stepLine("1. Understand the idea", flow?.steps.understand, profile ? `Interpreted as “${profile.businessType}”` : undefined)}
            {stepLine(
              "2. Competitors near you",
              flow?.steps.competitors,
              flow?.steps.competitors.status === "ok" ? `${flow.steps.competitors.data.count} real businesses found` : undefined,
            )}
            {stepLine("3. Neighbourhood data", flow?.steps.market, "Population, footfall and access signals loaded")}
            {stepLine(
              "4. Web market research",
              flow?.steps.research,
              research?.available === false ? "Not configured" : `${research?.sources?.length ?? 0} sources cited`,
            )}
          </ol>
          {flowState === "error" && <p className="text-sm text-muted-foreground">The analysis could not be run right now.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <p className="font-semibold">Live web research</p>
            <Badge variant="secondary" className="text-[10px]">From web sources</Badge>
          </div>
          {researchState === "loading" && (
            <p className="text-sm text-muted-foreground">Searching the web for current data on this idea…</p>
          )}
          {researchState === "error" && (
            <p className="text-sm text-muted-foreground">Web research is unavailable right now.</p>
          )}
          {research && !research.available && (
            <p className="text-sm text-muted-foreground">{research.reason}</p>
          )}
          {research?.available && (
            <div className="space-y-3">
              {research.whatItIs && <p className="text-sm">{research.whatItIs}</p>}
              <div className="grid gap-2 text-sm md:grid-cols-3">
                {research.marketSize && <p><span className="font-medium">Market size:</span> {research.marketSize}</p>}
                {research.growth && <p><span className="font-medium">Growth:</span> {research.growth}</p>}
                {research.typicalInvestment && (
                  <p><span className="font-medium">Typical investment:</span> {research.typicalInvestment}</p>
                )}
              </div>
              {list("Current trends", research.trends)}
              {list("Leading players", research.leadingPlayers)}
              {list("Opportunities", research.opportunities)}
              {list("Risks", research.risks)}
              {list("Licences & regulations", research.regulations)}
              {research.sources && research.sources.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sources:{" "}
                  {research.sources.map((src, i) => (
                    <span key={src.url}>
                      {i > 0 && " · "}
                      <a className="underline" href={src.url} target="_blank" rel="noreferrer">{src.title}</a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {profile && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <p className="font-semibold">What we understood: {profile.businessType}</p>
              <Badge variant="secondary" className="text-[10px]">
                {profile.source === "llm" ? "AI-interpreted" : "Rule-based"}
              </Badge>
            </div>
            {profile.summary && <p className="text-sm text-muted-foreground">{profile.summary}</p>}
            {profile.customers.length > 0 && (
              <p className="text-sm"><span className="font-medium">Target customers:</span> {profile.customers.join(", ")}</p>
            )}
            {profile.competitorTerms.length > 0 && (
              <p className="text-sm"><span className="font-medium">Competitors look like:</span> {profile.competitorTerms.join(", ")}</p>
            )}
            {profile.wiki && (
              <p className="text-xs text-muted-foreground">
                {profile.wiki.extract}{" "}
                {profile.wiki.url && (
                  <a className="underline" href={profile.wiki.url} target="_blank" rel="noreferrer">Wikipedia</a>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <p className="text-sm text-muted-foreground">
        <Lightbulb className="mr-1 inline h-4 w-4" />
        Insights for <span className="font-medium text-foreground">{opportunity.name}</span>.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((i, idx) => {
          const Icon = ICON[i.kind];
          return (
            <Card key={`${i.title}-${idx}`} className="transition hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"><Icon className="h-4 w-4" /></span>
                  <Badge variant="secondary" className="text-[10px]">{i.tag}</Badge>
                </div>
                <p className="font-semibold">{i.title}</p>
                <p className="text-sm text-muted-foreground">{i.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
