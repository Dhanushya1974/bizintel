import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { areaTypeFromPopulation, fetchSiteScore, type SiteScoreResult } from "@/lib/geo";
import type { Opportunity } from "@/lib/mock-data";
import { demandTimeseries, demographics } from "@/lib/opportunity-insights";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Real neighbourhood tiles from OSM signals, or null if we don't have enough. */
function liveTiles(s: SiteScoreResult["signals"]): { label: string; value: string }[] | null {
  const tiles: { label: string; value: string }[] = [];
  if (s.population != null) tiles.push({ label: "Area population", value: fmtNum(s.population) });
  const areaType = areaTypeFromPopulation(s.population);
  if (areaType) tiles.push({ label: "Area type", value: areaType });
  if (s.competitorCount != null) tiles.push({ label: "Direct competitors (2 km)", value: String(s.competitorCount) });
  if (s.commerce != null) tiles.push({ label: "Shops & offices (1 km)", value: fmtNum(s.commerce) });
  if (s.education != null) tiles.push({ label: "Schools & colleges (1.5 km)", value: String(s.education) });
  if (s.transitStops != null) tiles.push({ label: "Transit stops (800 m)", value: String(s.transitStops) });
  return tiles.length >= 3 ? tiles.slice(0, 6) : null;
}

export function MarketPanel({ opportunity }: { opportunity: Opportunity }) {
  const { user } = useAuth();
  const series = demandTimeseries(opportunity);
  const modeled = demographics(opportunity);

  const lat = user?.siteLat ?? user?.geoLat;
  const lng = user?.siteLng ?? user?.geoLng;
  const hasPin = typeof lat === "number" && typeof lng === "number";

  const [live, setLive] = useState<SiteScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasPin) {
      setLive(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSiteScore({
      lat: lat!,
      lng: lng!,
      category: opportunity.category,
      name: opportunity.name,
      demand: opportunity.demand,
      competition: opportunity.competition,
    })
      .then((r) => !cancelled && setLive(r))
      .catch(() => !cancelled && setLive(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hasPin, lat, lng, opportunity.category, opportunity.name, opportunity.demand, opportunity.competition]);

  const tiles = (live && liveTiles(live.signals)) || modeled;
  const isLive = !!(live && liveTiles(live.signals));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading neighbourhood data from OpenStreetMap…
          </span>
        ) : isLive ? (
          <>
            Live neighbourhood profile around{" "}
            <span className="font-medium text-foreground">
              {live!.signals.place || opportunity.name}
            </span>
            , from OpenStreetMap. The trend charts are the model's projection for {opportunity.category}.
          </>
        ) : (
          <>
            Modeled market profile for <span className="font-medium text-foreground">{opportunity.name}</span> —
            pin a location for live neighbourhood data.
          </>
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((d) => (
          <Card key={d.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="mt-1 text-lg font-bold">{d.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Demand trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="demand" stroke="oklch(0.62 0.16 258)" fill="oklch(0.62 0.16 258 / 0.25)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Competitor density</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="competition" fill="oklch(0.72 0.13 178)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
