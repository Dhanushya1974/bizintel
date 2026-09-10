import { AlertTriangle, BarChart3, Info, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/lib/mock-data";
import { insightsFor, type IdeaInsight } from "@/lib/opportunity-insights";

const ICON: Record<IdeaInsight["kind"], typeof TrendingUp> = {
  score: Sparkles,
  trend: TrendingUp,
  reco: BarChart3,
  risk: AlertTriangle,
  info: Info,
};

export function InsightsPanel({ opportunity }: { opportunity: Opportunity }) {
  const insights = insightsFor(opportunity);
  return (
    <div className="space-y-4">
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
