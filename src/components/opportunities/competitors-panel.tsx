import { useEffect, useState } from "react";
import { Loader2, MapPin, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/brand/empty-state";
import { useAuth } from "@/lib/auth";
import { fetchNearby, type NearbyPlace, type NearbyResult } from "@/lib/geo";
import type { Opportunity } from "@/lib/mock-data";
import { competitorsFor } from "@/lib/opportunity-insights";

type Row = { id: string; name: string; kind: string; distanceMi: number; info: string };

function fromEstimate(o: Opportunity): Row[] {
  return competitorsFor(o).map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.category,
    distanceMi: c.distanceMi,
    info: `★ ${c.rating} (${c.reviews})`,
  }));
}

function fromLive(places: NearbyPlace[]): Row[] {
  return places.map((p) => ({ id: p.id, name: p.name, kind: p.kind, distanceMi: p.distanceMi, info: p.info ?? "" }));
}

type State =
  | { kind: "loading" }
  | { kind: "none" } // no coordinates yet
  | { kind: "error" } // lookup threw
  | { kind: "live"; result: NearbyResult }
  | { kind: "empty"; result: NearbyResult }; // lookup ok, nothing mapped nearby

export function CompetitorsPanel({ opportunity }: { opportunity: Opportunity }) {
  const { user } = useAuth();
  const lat = user?.siteLat ?? user?.geoLat;
  const lng = user?.siteLng ?? user?.geoLng;
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const [state, setState] = useState<State>(hasCoords ? { kind: "loading" } : { kind: "none" });

  useEffect(() => {
    if (!hasCoords) {
      setState({ kind: "none" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchNearby({ lat: lat!, lng: lng!, category: opportunity.category, name: opportunity.name })
      .then((r) => {
        if (cancelled) return;
        setState(r.competitors.length ? { kind: "live", result: r } : { kind: "empty", result: r });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [hasCoords, lat, lng, opportunity.category, opportunity.name]);

  const isLive = state.kind === "live";
  const rows: Row[] = isLive ? fromLive(state.result.competitors) : fromEstimate(opportunity);

  const kmText = (m: number) => `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} km`;

  const caption =
    state.kind === "loading" ? (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking OpenStreetMap for nearby businesses —
        showing estimates meanwhile…
      </span>
    ) : state.kind === "live" ? (
      <>
        {rows.length} real nearby {state.result.source === "cache" ? "(cached) " : ""}businesses around{" "}
        <span className="font-medium text-foreground">{opportunity.name}</span>, from OpenStreetMap
        {state.result.broadened
          ? ` — widened to ${kmText(state.result.radius)} and broader categories (few exact matches mapped).`
          : "."}
      </>
    ) : state.kind === "empty" ? (
      <>
        No competing businesses are mapped within {kmText(state.result.radius)} of your location. That
        usually means genuinely low competition here — or thin OpenStreetMap coverage.
      </>
    ) : (
      <>
        Estimated competitors for <span className="font-medium text-foreground">{opportunity.name}</span> —{" "}
        {state.kind === "error"
          ? "the live lookup is unavailable right now."
          : "add your location in Settings for real nearby data."}
      </>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{caption}</p>
      {state.kind === "empty" ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={MapPin}
              title="No mapped competitors nearby"
              description={`Nothing in the ${opportunity.category} category is listed within ${kmText(
                state.result.radius,
              )} on OpenStreetMap. Low direct competition is a positive signal — verify on the ground before relying on it.`}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Competitors within ~1.2 miles</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>{isLive ? "Detail" : "Rating"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{c.kind}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap"><MapPin className="mr-1 inline h-3 w-3 text-muted-foreground" />{c.distanceMi} mi</TableCell>
                      <TableCell className="text-muted-foreground">
                        {!isLive && c.info.startsWith("★") ? (
                          <span><Star className="mr-1 inline h-3 w-3 fill-[color:var(--color-brand)] text-[color:var(--color-brand)]" />{c.info.slice(2)}</span>
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
          <Card>
            <CardHeader><CardTitle>Cluster map</CardTitle></CardHeader>
            <CardContent>
              <div className="relative h-72 overflow-hidden rounded-lg bg-[color:var(--color-navy)]/5">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.72 0.13 178 / 0.4) 0, transparent 40%), radial-gradient(circle at 70% 60%, oklch(0.62 0.16 258 / 0.4) 0, transparent 40%)" }} />
                {rows.slice(0, 8).map((c, i) => (
                  <span key={c.id} className="absolute h-3 w-3 rounded-full bg-[color:var(--color-brand)] ring-2 ring-white" style={{ left: `${15 + i * 9}%`, top: `${25 + (i % 3) * 20}%` }} title={c.name} />
                ))}
                <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-teal)] ring-4 ring-white" title="Your site" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Teal marker = your site. Blue markers = competitors.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
