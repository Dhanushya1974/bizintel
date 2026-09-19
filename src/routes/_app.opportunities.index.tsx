import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, Download, Filter, Save, Search } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { resolveFocusOpportunity } from "@/lib/opportunity-insights";
import { useSavedOpportunities } from "@/lib/saved";
import { useProjects } from "@/lib/projects";
import { adHocReport, downloadOpportunity, downloadReport } from "@/lib/report";
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

/** The one idea this whole section is about — picked in the dashboard / setup. */
function useFocusOpportunity() {
  const { user } = useAuth();
  const ownIdea = (user?.mode ?? "own-idea") === "own-idea";
  const opportunity = resolveFocusOpportunity({
    focusOpportunityId: user?.focusOpportunityId,
    industry: user?.industry,
    idea: user?.idea,
    ownIdea,
  });
  const displayName = opportunity.name;
  return { opportunity, displayName, ownIdea };
}

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

/** Overview = the focused idea up top, then the rest for comparison. */
function Overview() {
  const { opportunity: focus, displayName, ownIdea } = useFocusOpportunity();
  const { isSaved, toggle } = useSavedOpportunities();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const others = OPPORTUNITIES.filter((o) => o.id !== focus.id);
  const cats = ["all", ...Array.from(new Set(others.map((o) => o.category)))];
  const list = others
    .filter((o) => (cat === "all" || o.category === cat) && o.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <Card className="border-[color:var(--color-brand)]/20 bg-gradient-to-br from-[color:var(--color-brand)]/5 to-transparent">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <ScoreRing score={focus.score} size={96} label={ownIdea ? "Idea score" : "Match"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[color:var(--color-brand)]/15 text-[color:var(--color-brand)] hover:bg-[color:var(--color-brand)]/15 text-[10px] font-semibold uppercase tracking-widest">
                In focus
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{focus.category}</Badge>
            </div>
            <h2 className="mt-1 text-xl font-bold">{displayName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{focus.rationale}</p>
            <div className="mt-4 grid max-w-md grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Demand</p><p className="font-semibold text-foreground">{focus.demand}</p></div>
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Competition</p><p className="font-semibold text-foreground">{focus.competition}</p></div>
              <div className="rounded-md bg-secondary/50 p-2"><p className="text-muted-foreground">Break-even</p><p className="font-semibold text-foreground">{focus.breakEvenMonths}mo</p></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The Market, Competitors, Location and Insights tabs all analyze this idea.
            </p>
            <div className="mt-4">
              <Link to="/opportunities/$id" params={{ id: focus.id }}>
                <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                  View full analysis <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Compare other ideas</p>
        <Card className="mb-4">
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
  const goTo = useNavigate();
  const active = tab ?? "overview";
  const { ids } = useSavedOpportunities();
  const { user } = useAuth();
  const { projects, add: addProject } = useProjects();
  const { opportunity: focus, displayName, ownIdea } = useFocusOpportunity();

  const projectLocation =
    [user?.city, user?.state, user?.country].filter(Boolean).join(", ") ||
    user?.siteLabel ||
    "Location not set";
  const projectTitle = `${ownIdea && user?.idea ? user.idea : displayName} — ${
    user?.city ?? projectLocation
  }`;

  const downloadFullReport = async () => {
    const report = await adHocReport({
      opportunity: focus,
      title: `${ownIdea && user?.idea ? user.idea : displayName} — full report`,
      location: projectLocation,
      businessType: focus.category,
      lat: user?.siteLat ?? user?.geoLat,
      lng: user?.siteLng ?? user?.geoLng,
    });
    downloadReport(report);
    toast.success("Downloading full report — market, competitors, location & insights");
  };

  const saveProject = () => {
    // don't stack an identical analysis; genuinely different ones accumulate
    const dup = projects.find(
      (p) => p.focusOpportunityId === focus.id && p.location === projectLocation,
    );
    if (dup) {
      toast.info("This analysis is already in Projects & Reports");
    } else {
      addProject({
        title: projectTitle,
        location: projectLocation,
        businessType: ownIdea && user?.idea ? user.idea : focus.name,
        category: focus.category,
        focusOpportunityId: focus.id,
        lat: user?.siteLat ?? user?.geoLat,
        lng: user?.siteLng ?? user?.geoLng,
        score: focus.score,
      });
      toast.success("Saved to Projects & Reports");
    }
    goTo({ to: "/projects" });
  };

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description={`Market, competitor, location and insight signals for "${displayName}".`}
        actions={
          <>
            <Button variant="outline" onClick={downloadFullReport}>
              <Download className="mr-1 h-4 w-4" /> Download full report
            </Button>
            <Button
              onClick={saveProject}
              className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
            >
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
          </>
        }
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
          <TabsContent value="market" className="mt-6"><MarketPanel opportunity={focus} /></TabsContent>
          <TabsContent value="competitors" className="mt-6"><CompetitorsPanel opportunity={focus} /></TabsContent>
          <TabsContent value="location" className="mt-6"><LocationPanel opportunity={focus} /></TabsContent>
          <TabsContent value="insights" className="mt-6"><InsightsPanel opportunity={focus} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
