import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Info, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/lib/mock-data";
import { analyzeIdea, researchIdea, type IdeaProfile, type IdeaResearch } from "@/lib/geo";
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
  const [profile, setProfile] = useState<IdeaProfile | null>(null);
  useEffect(() => {
    let alive = true;
    setProfile(null);
    analyzeIdea(opportunity.name, opportunity.category)
      .then((p) => alive && setProfile(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [opportunity.name, opportunity.category]);
  const [research, setResearch] = useState<IdeaResearch | null>(null);
  const [researchState, setResearchState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    let alive = true;
    setResearch(null);
    setResearchState("loading");
    researchIdea(opportunity.name, location)
      .then((r) => {
        if (!alive) return;
        setResearch(r);
        setResearchState("done");
      })
      .catch(() => alive && setResearchState("error"));
    return () => {
      alive = false;
    };
  }, [opportunity.name, location]);
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
