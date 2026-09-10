import { useEffect, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/brand/score-ring";
import { useAuth } from "@/lib/auth";
import { embedUrl, fetchSiteScore, resolveMapsLink, type SiteScoreResult } from "@/lib/geo";
import type { Opportunity } from "@/lib/mock-data";
import { siteScore } from "@/lib/opportunity-insights";

function fmtPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function LocationPanel({ opportunity }: { opportunity: Opportunity }) {
  const { user, updateUser } = useAuth();
  const estimate = siteScore(opportunity);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const exactPin = typeof user?.siteLat === "number" && typeof user?.siteLng === "number";
  const lat = exactPin ? user!.siteLat! : user?.geoLat;
  const lng = exactPin ? user!.siteLng! : user?.geoLng;
  const hasPin = typeof lat === "number" && typeof lng === "number";

  const [live, setLive] = useState<SiteScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    if (!hasPin) {
      setLive(null);
      return;
    }
    let cancelled = false;
    setScoring(true);
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
      .finally(() => !cancelled && setScoring(false));
    return () => {
      cancelled = true;
    };
  }, [hasPin, lat, lng, opportunity.category, opportunity.name, opportunity.demand, opportunity.competition]);

  const overall = live?.overall ?? estimate.overall;
  const rows = live?.rows ?? estimate.rows;
  const sig = live?.signals;

  const pin = async () => {
    if (!link.trim()) return toast.error("Paste a Google Maps link first");
    setBusy(true);
    try {
      const { latitude, longitude } = await resolveMapsLink(link.trim());
      updateUser({ siteLat: latitude, siteLng: longitude, siteLabel: link.trim() });
      setLink("");
      toast.success(`Pinned ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve that link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Site fit for <span className="font-medium text-foreground">{opportunity.name}</span>, scored against its demand and competition.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Paste a Google Maps link to pin your site (e.g. https://maps.app.goo.gl/…)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pin()}
            />
          </div>
          <Button
            onClick={pin}
            disabled={busy}
            className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Pin location
          </Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Map view</CardTitle>
            {exactPin && (
              <button
                onClick={() => updateUser({ siteLat: undefined, siteLng: undefined, siteLabel: undefined })}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear pin
              </button>
            )}
          </CardHeader>
          <CardContent>
            {hasPin ? (
              <>
                <iframe
                  title="Site location"
                  className="h-96 w-full rounded-lg border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={embedUrl(lat!, lng!)}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {exactPin
                    ? `Exact pin at ${lat!.toFixed(5)}, ${lng!.toFixed(5)}.`
                    : `Approximate — from your city / pincode. Paste a Maps link above for an exact pin.`}
                </p>
              </>
            ) : (
              <>
                <div className="relative h-96 overflow-hidden rounded-lg bg-[color:var(--color-navy)]/5">
                  <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(oklch(0.62 0.16 258 / 0.08) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.16 258 / 0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 40% 45%, oklch(0.72 0.13 178 / 0.5), transparent 30%), radial-gradient(circle at 65% 55%, oklch(0.62 0.16 258 / 0.4), transparent 30%)" }} />
                  <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[color:var(--color-brand)] text-white ring-4 ring-white shadow-lg"><MapPin className="h-5 w-5" /></span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Paste a Google Maps link above to drop a real pin here.</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Site score</CardTitle>
            {scoring && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing score={overall} size={140} label="Overall" />
            {rows.map((r) => (
              <div key={r.l} className="w-full">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-semibold">{r.v}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-[color:var(--color-brand)]" style={{ width: `${r.v}%` }} />
                </div>
              </div>
            ))}
            <p className="w-full text-[11px] leading-relaxed text-muted-foreground">
              {live?.live && sig ? (
                <>
                  Live —{" "}
                  {[
                    sig.competitorCount != null && `${sig.competitorCount} competitors within 2 km`,
                    sig.population != null &&
                      `~${fmtPop(sig.population)}${sig.place ? ` in ${sig.place}` : ""}`,
                    sig.transitStops != null && `${sig.transitStops} transit stops`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </>
              ) : hasPin && scoring ? (
                "Scoring this location from OpenStreetMap…"
              ) : (
                "Estimated from the opportunity model — pin a location for a live score."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
