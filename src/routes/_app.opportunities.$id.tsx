import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, BookmarkCheck, Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/brand/page-header";
import { ScoreRing } from "@/components/brand/score-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OPPORTUNITIES, REVENUE_FORECAST } from "@/lib/mock-data";
import { useSavedOpportunities } from "@/lib/saved";
import { downloadOpportunity } from "@/lib/report";

export const Route = createFileRoute("/_app/opportunities/$id")({
  head: () => ({ meta: [{ title: "Opportunity — BizIntel" }] }),
  component: Detail,
  notFoundComponent: () => <div className="p-8">Opportunity not found.</div>,
});

function Detail() {
  const { id } = Route.useParams();
  const o = OPPORTUNITIES.find((x) => x.id === id);
  const { isSaved, toggle } = useSavedOpportunities();
  if (!o) throw notFound();
  const saved = isSaved(o.id);
  return (
    <div>
      <PageHeader
        title={o.name}
        description={`${o.category} • ${o.confidence} confidence`}
        actions={
          <>
            <Link to="/opportunities"><Button variant="ghost"><ArrowLeft className="mr-1 h-4 w-4" />All opportunities</Button></Link>
            <Button
              variant={saved ? "secondary" : "outline"}
              onClick={() => {
                toggle(o.id);
                toast.success(saved ? `Removed ${o.name}` : `Saved ${o.name}`);
              }}
            >
              {saved ? <BookmarkCheck className="mr-1 h-4 w-4" /> : <Bookmark className="mr-1 h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
            <Button
              className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
              onClick={() => {
                downloadOpportunity(o);
                toast.success(`Downloading ${o.name}`);
              }}
            >
              <Download className="mr-1 h-4 w-4" />Download
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6">
            <ScoreRing score={o.score} size={140} label="Opportunity" />
            <div className="mt-4 flex flex-wrap justify-center gap-1">
              {o.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
            <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Demand</p><p className="text-base font-semibold">{o.demand}</p></div>
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Competition</p><p className="text-base font-semibold">{o.competition}</p></div>
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Break-even</p><p className="text-base font-semibold">{o.breakEvenMonths}mo</p></div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Why this scored high</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{o.rationale}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Investment & forecast</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">Estimated investment <span className="font-semibold">${o.investmentMin.toLocaleString()}–${o.investmentMax.toLocaleString()}</span></p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_FORECAST}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                    <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="revenue" stroke="oklch(0.62 0.16 258)" fill="oklch(0.62 0.16 258 / 0.2)" strokeWidth={2} />
                    <Area type="monotone" dataKey="cost" stroke="oklch(0.72 0.13 178)" fill="oklch(0.72 0.13 178 / 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[color:var(--color-brand)]" />Key risks</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2 text-sm text-muted-foreground">{o.risks.map((r) => <li key={r} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)]" />{r}</li>)}</ul></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}