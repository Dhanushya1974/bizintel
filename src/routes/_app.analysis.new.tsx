import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { geocodeLocation } from "@/lib/geo";

const TYPES = ["coffee", "bakery", "wine bar", "pilates", "pet daycare", "poke bowls", "other"] as const;
type BizType = (typeof TYPES)[number];

const TYPE_TO_OPP: Record<Exclude<BizType, "other">, string> = {
  coffee: "opp-1",
  bakery: "opp-1",
  "wine bar": "opp-3",
  pilates: "opp-2",
  "pet daycare": "opp-4",
  "poke bowls": "opp-5",
};
const TYPE_TO_CATEGORY: Record<Exclude<BizType, "other">, string> = {
  coffee: "Food & Beverage",
  bakery: "Food & Beverage",
  "wine bar": "Food & Beverage",
  pilates: "Health & Wellness",
  "pet daycare": "Consumer Services",
  "poke bowls": "Food & Beverage",
};

/** Best-guess reference opportunity + category for a free-text business idea. */
function classify(text: string): { oppId: string; category: string } {
  const t = text.toLowerCase();
  if (/gym|fitness|yoga|pilates|spa|salon|wellness|studio|clinic|therapy|dental/.test(t))
    return { oppId: "opp-2", category: "Health & Wellness" };
  if (/pet|dog|vet|groom|daycare|laundry|dry clean|repair|cleaning|tailor|salon|barber|courier/.test(t))
    return { oppId: "opp-4", category: "Consumer Services" };
  if (/wine|bar|pub|brew|liquor/.test(t)) return { oppId: "opp-3", category: "Food & Beverage" };
  return { oppId: "opp-1", category: "Food & Beverage" };
}

export const Route = createFileRoute("/_app/analysis/new")({
  head: () => ({ meta: [{ title: "New analysis — BizIntel" }] }),
  component: NewAnalysis,
});

function NewAnalysis() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [loc, setLoc] = useState("");
  const [type, setType] = useState<BizType>("coffee");
  const [customType, setCustomType] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = loc.trim();
    if (!q) return toast.error("Enter a location");
    const custom = customType.trim();
    if (type === "other" && !custom) return toast.error("Describe the business type");

    const bizName = type === "other" ? custom : type;
    const { oppId, category } =
      type === "other" ? classify(custom) : { oppId: TYPE_TO_OPP[type], category: TYPE_TO_CATEGORY[type] };

    setBusy(true);
    try {
      const isPin = /^\d{4,6}$/.test(q);
      const g = await geocodeLocation(isPin ? { pincode: q } : { city: q });
      const cityLabel = g.address?.city ?? q;

      updateUser({
        // new location wins — drop any previously pinned site
        siteLat: undefined,
        siteLng: undefined,
        siteLabel: undefined,
        geoLat: g.latitude,
        geoLng: g.longitude,
        city: g.address?.city ?? (isPin ? undefined : q),
        state: g.address?.state ?? undefined,
        pincode: isPin ? q : undefined,
        // focus the Opportunities section on the chosen / closest business type
        mode: "ai",
        idea: type === "other" ? bizName : undefined,
        focusOpportunityId: oppId,
        industry: category,
      });
      toast.success(`Analysis ready for ${cityLabel}`);
      navigate({ to: "/opportunities" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyze that location");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="New analysis" description="Score an idea against a location in minutes." />
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={run} className="space-y-4">
              <div>
                <Label htmlFor="loc">Location</Label>
                <Input
                  id="loc"
                  placeholder="Pincode, city or neighborhood"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A pincode gives the sharpest result; a city name also works.
                </p>
              </div>
              <div>
                <Label>Business type</Label>
                <Select value={type} onValueChange={(v) => setType(v as BizType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "other" ? "Other…" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === "other" && (
                <div>
                  <Label htmlFor="customType">Describe the business</Label>
                  <Input
                    id="customType"
                    placeholder="e.g. cloud kitchen, gym, salon, electronics repair"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll pull nearby businesses of the closest kind from OpenStreetMap.
                  </p>
                </div>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  "Run analysis"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
