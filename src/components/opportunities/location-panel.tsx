import { MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/brand/score-ring";

const SITE_SCORE = [
  { l: "Foot traffic", v: 88 },
  { l: "Demand match", v: 81 },
  { l: "Competition", v: 62 },
  { l: "Accessibility", v: 79 },
];

export function LocationPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Enter an address or neighborhood" />
          </div>
          <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">Score location</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Map view</CardTitle></CardHeader>
          <CardContent>
            <div className="relative h-96 overflow-hidden rounded-lg bg-[color:var(--color-navy)]/5">
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(oklch(0.62 0.16 258 / 0.08) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.16 258 / 0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 40% 45%, oklch(0.72 0.13 178 / 0.5), transparent 30%), radial-gradient(circle at 65% 55%, oklch(0.62 0.16 258 / 0.4), transparent 30%)" }} />
              <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[color:var(--color-brand)] text-white ring-4 ring-white shadow-lg"><MapPin className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Google Maps integration ready — plug in your API key to enable live tiles.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Site score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing score={84} size={140} label="Overall" />
            {SITE_SCORE.map((r) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
