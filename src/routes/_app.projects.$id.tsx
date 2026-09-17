import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Printer, Star, MapPin } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ScoreRing } from "@/components/brand/score-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProjectReport, downloadReport, type ProjectReport } from "@/lib/report";

export const Route = createFileRoute("/_app/projects/$id")({
  head: () => ({ meta: [{ title: "Project report — BizIntel" }] }),
  component: Report,
  notFoundComponent: () => <div className="p-8">Report not found.</div>,
});

const money = (n: number) => `$${n.toLocaleString()}`;

function Report() {
  const { id } = Route.useParams();
  const [report, setReport] = useState<ProjectReport | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setReport(undefined);
    getProjectReport(id).then((r) => !cancelled && setReport(r));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (report === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Building report…
      </div>
    );
  }
  if (!report) throw notFound();
  const { project: p, opportunity: o } = report;

  return (
    <div>
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-8 print:hidden">
        <Link to="/projects">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Projects</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print / Save as PDF
          </Button>
          <Button
            size="sm"
            className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
            onClick={() => downloadReport(report)}
          >
            <Download className="mr-1 h-4 w-4" /> Download file
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-brand)]">
              Consolidated business report
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{p.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {p.location} • {p.businessType} • Generated {report.generatedAt}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px]">{o.confidence} confidence</Badge>
              <Badge className="bg-[color:var(--color-teal)]/20 text-foreground hover:bg-[color:var(--color-teal)]/20 text-[10px]">{p.status}</Badge>
              {o.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          </div>
          <ScoreRing score={p.score} size={120} label="Opportunity" />
        </header>

        {/* Executive summary */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Executive summary</h2>
          <p className="text-sm text-muted-foreground">{o.rationale}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">Demand</p><p className="text-base font-semibold">{o.demand}</p></div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">Competition</p><p className="text-base font-semibold">{o.competition}</p></div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">Break-even</p><p className="text-base font-semibold">{o.breakEvenMonths}mo</p></div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">Investment</p><p className="text-base font-semibold">{money(o.investmentMin)}+</p></div>
          </div>
        </section>

        {/* Market analysis */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Market analysis</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {report.demographics.map((d) => (
              <div key={d.label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="mt-1 text-base font-bold">{d.value}</p>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Demand vs. competition — 12 months</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.demand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="demand" stroke="oklch(0.62 0.16 258)" fill="oklch(0.62 0.16 258 / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="competition" stroke="oklch(0.72 0.13 178)" fill="oklch(0.72 0.13 178 / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Competitor analysis */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Competitor analysis</h2>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.competitors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                      <TableCell>{c.distanceMi} mi</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.rating != null ? (
                          <>
                            <Star className="mr-1 inline h-3 w-3 fill-[color:var(--color-brand)] text-[color:var(--color-brand)]" />
                            {c.rating} <span className="text-xs">({c.reviews})</span>
                          </>
                        ) : (
                          c.info || "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Location intelligence */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Location intelligence</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.siteScore.map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold">{s.value}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-[color:var(--color-brand)]" style={{ width: `${s.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Financial forecast */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Financial forecast</h2>
          <p className="text-sm text-muted-foreground">
            Estimated investment <span className="font-semibold text-foreground">{money(o.investmentMin)}–{money(o.investmentMax)}</span> • projected break-even at month {o.breakEvenMonths}.
          </p>
          <Card>
            <CardContent className="h-64 pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.62 0.16 258)" fill="oklch(0.62 0.16 258 / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cost" stroke="oklch(0.72 0.13 178)" fill="oklch(0.72 0.13 178 / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Insights & recommendations */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Insights &amp; recommendations</h2>
          <div className="space-y-2">
            {report.insights.map((i) => (
              <div key={i.title} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{i.tag}</Badge>
                  <p className="font-semibold">{i.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key risks */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Key risks</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {o.risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          Generated by BizIntel • {report.generatedAt} • This single report consolidates market, competitor, location, financial and insight analysis for {p.title}.
        </footer>
      </article>
    </div>
  );
}
