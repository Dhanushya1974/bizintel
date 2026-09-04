import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Download, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/brand/page-header";
import { ScoreRing } from "@/components/brand/score-ring";
import { EmptyState } from "@/components/brand/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OPPORTUNITIES, type Opportunity } from "@/lib/mock-data";
import { useSavedOpportunities } from "@/lib/saved";
import { downloadOpportunity } from "@/lib/report";
import { MarketPanel } from "@/components/opportunities/market-panel";
import { CompetitorsPanel } from "@/components/opportunities/competitors-panel";
import { LocationPanel } from "@/components/opportunities/location-panel";
import { InsightsPanel } from "@/components/opportunities/insights-panel";

const TABS = ["overview", "saved", "market", "competitors", "location", "insights"] as const;
type OppTab = (typeof TABS)[number];

export const Route = createFileRoute("/_app/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities — BizIntel" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: OppTab } => {
    const tab = search.tab as OppTab;
    return TABS.includes(tab) ? { tab } : {};
  },
  component: Opps,
});

function OpportunityCard({
  o,
  saved,
  onToggleSave,
}: {
  o: Opportunity;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <Card className="transition hover:border-[color:var(--color-brand)]/40 hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={o.score} size={72} label="Score" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{o.name}</p>
            <p className="text-xs text-muted-foreground">{o.category}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {o.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              <Badge className="bg-[color:var(--color-teal)]/20 text-foreground hover:bg-[color:var(--color-teal)]/20 text-[10px]">{o.confidence} confidence</Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{o.rationale}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Demand</p><p className="font-semibold text-foreground">{o.demand}</p></div>
          <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Competition</p><p className="font-semibold text-foreground">{o.competition}</p></div>
          <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Break-even</p><p className="font-semibold text-foreground">{o.breakEvenMonths}mo</p></div>
        </div>
        <div className="mt-auto space-y-2">
          <Link to="/opportunities/$id" params={{ id: o.id }}>
            <Button className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">View analysis</Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={saved ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                onToggleSave();
                toast.success(saved ? `Removed ${o.name}` : `Saved ${o.name}`);
              }}
            >
              {saved ? <BookmarkCheck className="mr-1 h-4 w-4" /> : <Bookmark className="mr-1 h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadOpportunity(o);
                toast.success(`Downloading ${o.name}`);
              }}
            >
              <Download className="mr-1 h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const { isSaved, toggle } = useSavedOpportunities();
  const cats = ["all", ...Array.from(new Set(OPPORTUNITIES.map((o) => o.category)))];
  const list = OPPORTUNITIES.filter(
    (o) => (cat === "all" || o.category === cat) && o.name.toLowerCase().includes(q.toLowerCase()),
  ).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search opportunities…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-56"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => (
          <OpportunityCard key={o.id} o={o} saved={isSaved(o.id)} onToggleSave={() => toggle(o.id)} />
        ))}
      </div>
    </div>
  );
}

function SavedTab() {
  const { ids, isSaved, toggle } = useSavedOpportunities();
  const list = OPPORTUNITIES.filter((o) => ids.includes(o.id)).sort((a, b) => b.score - a.score);

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved opportunities"
        description="Tap Save on any opportunity in the Overview tab to keep it here for quick access and export."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} saved</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            list.forEach((o) => downloadOpportunity(o));
            toast.success(`Downloading ${list.length} report${list.length > 1 ? "s" : ""}`);
          }}
        >
          <Download className="mr-1 h-4 w-4" /> Download all
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => (
          <OpportunityCard key={o.id} o={o} saved={isSaved(o.id)} onToggleSave={() => toggle(o.id)} />
        ))}
      </div>
    </div>
  );
}

function Opps() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const active = tab ?? "overview";
  const { ids } = useSavedOpportunities();

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Ranked opportunities plus the market, competitor, location and insight signals behind them."
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Tabs
          value={active}
          onValueChange={(v) => navigate({ search: { tab: v as OppTab }, replace: true })}
        >
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="saved">Saved{ids.length ? ` (${ids.length})` : ""}</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><Overview /></TabsContent>
          <TabsContent value="saved" className="mt-6"><SavedTab /></TabsContent>
          <TabsContent value="market" className="mt-6"><MarketPanel /></TabsContent>
          <TabsContent value="competitors" className="mt-6"><CompetitorsPanel /></TabsContent>
          <TabsContent value="location" className="mt-6"><LocationPanel /></TabsContent>
          <TabsContent value="insights" className="mt-6"><InsightsPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
