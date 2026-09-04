import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/analysis/new")({
  head: () => ({ meta: [{ title: "New analysis — BizIntel" }] }),
  component: () => {
    const navigate = useNavigate();
    const [loc, setLoc] = useState("");
    const [type, setType] = useState("coffee");
    const [busy, setBusy] = useState(false);
    const run = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loc) return toast.error("Enter a location");
      setBusy(true);
      await new Promise((r) => setTimeout(r, 900));
      toast.success("Analysis complete");
      navigate({ to: "/opportunities" });
    };
    return (
      <div>
        <PageHeader title="New analysis" description="Score an idea against a location in minutes." />
        <div className="mx-auto max-w-2xl p-4 sm:p-8">
          <Card><CardContent className="p-6">
            <form onSubmit={run} className="space-y-4">
              <div><Label>Location</Label><Input placeholder="City, neighborhood or address" value={loc} onChange={(e) => setLoc(e.target.value)} /></div>
              <div><Label>Business type</Label>
                <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["coffee","bakery","wine bar","pilates","pet daycare","poke bowls"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">{busy ? "Running…" : "Run analysis"}</Button>
            </form>
          </CardContent></Card>
        </div>
      </div>
    );
  },
});