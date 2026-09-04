import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const INSIGHTS = [
  { icon: TrendingUp, tag: "Trend", title: "Wellness search intent up 38% YoY", body: "Boutique fitness and pilates studios are seeing above-market demand in urban Seattle neighborhoods." },
  { icon: Sparkles, tag: "Recommendation", title: "Open a specialty coffee shop in Ballard", body: "Score 87 — dense residential traffic and only 2 comparable operators within 6 minutes." },
  { icon: Lightbulb, tag: "Insight", title: "Poke bowl category is saturated", body: "5+ competitors within 1 mile of Fremont — consider adjacent white-space concepts instead." },
];

export function InsightsPanel() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {INSIGHTS.map((i) => (
        <Card key={i.title} className="transition hover:shadow-md">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"><i.icon className="h-4 w-4" /></span>
              <Badge variant="secondary" className="text-[10px]">{i.tag}</Badge>
            </div>
            <p className="font-semibold">{i.title}</p>
            <p className="text-sm text-muted-foreground">{i.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
