import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { geocodeLocation } from "@/lib/geo";

const MODES = [
  { id: "own-idea" as const, label: "I have my own idea", icon: Lightbulb },
  { id: "ai" as const, label: "AI recommendations", icon: Sparkles },
];

const CATEGORIES = [
  "Food & Beverage",
  "Retail",
  "Health & Wellness",
  "Consumer Services",
  "Technology",
  "Education",
  "Hospitality",
  "Other",
];

const BUDGETS = ["Under ₹1 Lakh", "₹1–5 Lakhs", "₹5–25 Lakhs", "₹25 Lakhs–1 Crore", "Above ₹1 Crore"];

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — BizIntel" }] }),
  component: Settings,
});

function Settings() {
  const { user, updateUser } = useAuth();
  const mode = user?.mode ?? "own-idea";
  const [city, setCity] = useState(user?.city ?? "");
  const [pincode, setPincode] = useState(user?.pincode ?? "");
  const [pinBusy, setPinBusy] = useState(false);

  /** On pincode blur: persist it, then fill in city + coordinates from the geocoder. */
  const applyPincode = async (pin: string) => {
    updateUser({ pincode: pin });
    if (!/^\d{4,}$/.test(pin.trim())) return;
    setPinBusy(true);
    try {
      const g = await geocodeLocation({ pincode: pin.trim(), country: user?.country });
      // pincode is the primary location — drop any stale exact map pin
      const patch: Parameters<typeof updateUser>[0] = {
        geoLat: g.latitude,
        geoLng: g.longitude,
        siteLat: undefined,
        siteLng: undefined,
        siteLabel: undefined,
      };
      if (g.address?.city) {
        patch.city = g.address.city;
        setCity(g.address.city);
      }
      if (g.address?.state) patch.state = g.address.state;
      updateUser(patch);
      toast.success("Location updated on the map");
    } catch {
      /* geocoder unavailable — leave fields as typed */
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, workspace, and preferences." />
      <div className="p-4 sm:p-8">
        <Tabs defaultValue="account">
          <TabsList><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="notif">Notifications</TabsTrigger></TabsList>
          <TabsContent value="account" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle>Dashboard mode</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Choose what your dashboard focuses on. You can switch anytime.
                  </p>
                  <div className="grid max-w-md grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          updateUser({ mode: m.id });
                          toast.success(`Dashboard set to ${m.label}`);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                          mode === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <m.icon className="h-4 w-4" /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "own-idea" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="idea">Your business idea</Label>
                    <Input
                      id="idea"
                      placeholder="e.g. Specialty coffee & bakery"
                      defaultValue={user?.idea}
                      onBlur={(e) => updateUser({ idea: e.target.value })}
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={user?.industry ?? ""} onValueChange={(v) => updateUser({ industry: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Budget</Label>
                    <Select value={user?.budget ?? ""} onValueChange={(v) => updateUser({ budget: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pincode">Pincode</Label>
                    <div className="relative">
                      <Input
                        id="pincode"
                        inputMode="numeric"
                        placeholder="e.g. 411001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        onBlur={(e) => applyPincode(e.target.value)}
                      />
                      {pinBusy && (
                        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Fills in from pincode"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={(e) => updateUser({ city: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === "ai"
                    ? "Recommendations are ranked using your category, budget and location."
                    : "Used to frame your idea's analysis."}
                </p>
              </CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label>Full name</Label><Input defaultValue={user?.name} /></div>
              <div><Label>Email</Label><Input defaultValue={user?.email} /></div>
              <div className="sm:col-span-2"><Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90" onClick={() => toast.success("Changes saved")}>Save changes</Button></div>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="notif" className="mt-4">
            <Card><CardContent className="space-y-4 p-6">
              {["Weekly market digest","New competitor alerts","Report ready emails","Product updates"].map((l) => (
                <div key={l} className="flex items-center justify-between"><Label>{l}</Label><Switch defaultChecked /></div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
