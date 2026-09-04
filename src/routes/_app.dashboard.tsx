import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Clock, MapPin, MessageSquare, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { StatCard } from "@/components/brand/stat-card";
import { ScoreRing } from "@/components/brand/score-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { OPPORTUNITIES } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BizIntel" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const isAi = (user?.mode ?? "own-idea") === "ai";
  const category = user?.industry;
  const place = [user?.city, user?.pincode].filter(Boolean).join(" · ");

  // The single opportunity this dashboard is about.
  const byId = user?.focusOpportunityId
    ? OPPORTUNITIES.find((o) => o.id === user.focusOpportunityId)
    : undefined;
  const byCategory = category
    ? [...OPPORTUNITIES].filter((o) => o.category === category).sort((a, b) => b.score - a.score)[0]
    : undefined;
  const focus = byId ?? byCategory ?? [...OPPORTUNITIES].sort((a, b) => b.score - a.score)[0];

  const heading = isAi ? focus.name : user?.idea || "Your idea";
  const context = [category, place, user?.budget].filter(Boolean).join(" · ");

  const otherMatches = isAi
    ? [...OPPORTUNITIES]
        .filter((o) => o.id !== focus.id && (!category || o.category === category))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  return (
    <div>
      <PageHeader
        title="Your workspace"
        description={
          isAi
            ? "The opportunity BizIntel matched for you, and what to do next."
            : "Everything for the idea you're validating — nothing else."
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-[color:var(--color-brand)]/20 bg-gradient-to-br from-[color:var(--color-brand)]/5 to-transparent">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
              <ScoreRing score={focus.score} size={96} label={isAi ? "Match" : "Idea score"} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-brand)]">
                  {isAi ? "Your pick" : "Your idea"}
                </p>
                <h2 className="mt-0.5 text-xl font-bold">{heading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  {context || "Add your location in Settings"}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{focus.rationale}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAi ? (
                    <Link to="/opportunities/$id" params={{ id: focus.id }}>
                      <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                        View full analysis <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/analysis/new">
                      <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                        Run full analysis <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Link to="/consultant">
                    <Button variant="outline">
                      <MessageSquare className="mr-1 h-4 w-4" /> Ask the AI consultant
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} label="Demand" value={focus.demand} />
          <StatCard icon={Users} label="Competition" value={focus.competition} />
          <StatCard icon={Clock} label="Break-even" value={`${focus.breakEvenMonths}mo`} />
        </div>

        {isAi && otherMatches.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Other matches
              </p>
              <div className="divide-y divide-border">
                {otherMatches.map((o) => (
                  <Link
                    key={o.id}
                    to="/opportunities/$id"
                    params={{ id: o.id }}
                    className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-secondary/50"
                  >
                    <span className="w-8 text-sm font-semibold text-[color:var(--color-brand)]">{o.score}</span>
                    <span className="flex-1 truncate text-sm">{o.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{o.category}</Badge>
                  </Link>
                ))}
              </div>
              <Link
                to="/opportunities"
                className="mt-2 block px-1 text-sm font-medium text-[color:var(--color-brand)] hover:underline"
              >
                See all opportunities →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
