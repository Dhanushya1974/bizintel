import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ArrowLeft, Check, Lightbulb, MapPin, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/brand/logo";
import { ScoreRing } from "@/components/brand/score-ring";
import { cn } from "@/lib/utils";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { recommendIdeas, type Recommendation } from "@/lib/recommend";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Get started — BizIntel" }] }),
  component: Setup,
});

const CATEGORIES = ["Any", "Food & Beverage", "Retail", "Health & Wellness", "Consumer Services", "Technology", "Education", "Hospitality", "Other"];
const BUDGETS = ["Under ₹1 Lakh", "₹1–5 Lakhs", "₹5–25 Lakhs", "₹25 Lakhs–1 Crore", "Above ₹1 Crore"];
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Singapore", "United Arab Emirates", "Other"];
const EXPERIENCE = ["No experience", "1–2 years", "3–5 years", "6–10 years", "10+ years"];
const TIMELINES = ["Immediately", "1–3 months", "3–6 months", "6–12 months", "Just exploring"];
const CHANNELS = ["Storefront", "Online", "Either"];
const RISKS = ["Low", "Balanced", "High"] as const;
const money = (n: number) => `$${n.toLocaleString()}`;

function Setup() {
  const user = useRequireAuth();
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"choose" | "form" | "results">("choose");
  const [mode, setMode] = useState<"own-idea" | "ai">("ai");

  // shared
  const [country, setCountry] = useState(user?.country ?? "");
  const [stateName, setStateName] = useState(user?.state ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [pincode, setPincode] = useState(user?.pincode ?? "");
  const [budget, setBudget] = useState(user?.budget ?? "");
  const [category, setCategory] = useState(user?.industry ?? "");

  // own idea
  const [idea, setIdea] = useState(user?.idea ?? "");

  // ai extra
  const [experience, setExperience] = useState("");
  const [timeline, setTimeline] = useState("");
  const [channel, setChannel] = useState("");
  const [risk, setRisk] = useState<(typeof RISKS)[number] | "">("");

  const [analysing, setAnalysing] = useState(false);
  const [results, setResults] = useState<Recommendation[]>([]);

  if (!user) return null;

  const persist = (patch: Parameters<typeof updateUser>[0]) => {
    updateUser({
      country,
      state: stateName,
      city,
      pincode,
      budget,
      industry: category === "Any" ? "" : category,
      onboarded: true,
      ...patch,
    });
    navigate({ to: "/dashboard" });
  };

  const submitOwnIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return toast.error("Describe your idea");
    if (!city.trim() || !pincode.trim()) return toast.error("Enter your city and pincode");
    if (!budget) return toast.error("Choose a budget");
    persist({ mode: "own-idea", idea: idea.trim(), focusOpportunityId: undefined });
  };

  const runRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !pincode.trim()) return toast.error("Enter your city and pincode");
    if (!budget) return toast.error("Choose a budget");
    setAnalysing(true);
    await new Promise((r) => setTimeout(r, 1100));
    setResults(recommendIdeas({ category, budget, experience, timeline, risk, channel, city, pincode }));
    setAnalysing(false);
    setPhase("results");
  };

  const chooseIdea = (r: Recommendation) => {
    persist({ mode: "ai", idea: undefined, focusOpportunityId: r.id, industry: r.category });
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <Logo linkTo="/dashboard" />
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => persist({ mode })}>
          Skip for now
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* ---------- Phase 1: choose ---------- */}
        {phase === "choose" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-brand)]">Welcome to BizIntel</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Let's start with your idea</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us where you want to build. We'll tailor everything to that location and pincode.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { id: "own-idea" as const, icon: Lightbulb, label: "I have a business idea", desc: "Describe it and we'll analyse it for your location." },
                { id: "ai" as const, icon: Sparkles, label: "I need an idea", desc: "AI recommends ideas from your location, pincode, budget and more." },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setMode(c.id);
                    setPhase("form");
                  }}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 text-left transition hover:border-[color:var(--color-brand)]/50 hover:shadow-md"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------- Phase 2: form ---------- */}
        {phase === "form" && (
          <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => setPhase("choose")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {mode === "own-idea" ? "Describe your idea" : "A few details for better recommendations"}
            </h1>

            <form onSubmit={mode === "own-idea" ? submitOwnIdea : runRecommend} className="mt-8 space-y-6">
              {mode === "own-idea" && (
                <div className="space-y-1.5">
                  <Label htmlFor="idea">Your business idea</Label>
                  <Textarea
                    id="idea"
                    rows={3}
                    placeholder="e.g. A specialty coffee & bakery focused on morning commuters near the metro station"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                  />
                </div>
              )}

              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-[color:var(--color-brand)]" /> Location
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" placeholder="e.g. Maharashtra" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="e.g. Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" inputMode="numeric" placeholder="e.g. 400001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{mode === "own-idea" ? "Category" : "Category interest"}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Budget</Label>
                    <Select value={budget} onValueChange={setBudget}>
                      <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                      <SelectContent>{BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {mode === "ai" && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Experience</Label>
                        <Select value={experience} onValueChange={setExperience}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{EXPERIENCE.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Timeline</Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{TIMELINES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Preferred channel</Label>
                        <Select value={channel} onValueChange={setChannel}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{CHANNELS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Risk appetite</Label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
                          {RISKS.map((x) => (
                            <button
                              key={x}
                              type="button"
                              onClick={() => setRisk(x)}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-xs font-medium transition",
                                risk === x ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {x}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={analysing}
                className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
              >
                {mode === "own-idea" ? (
                  "Analyse my idea"
                ) : analysing ? (
                  "Analysing your location…"
                ) : (
                  <>
                    <Wand2 className="mr-1 h-4 w-4" /> Get AI recommendations
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {/* ---------- Phase 3: results ---------- */}
        {phase === "results" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => setPhase("form")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Adjust details
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[color:var(--color-brand)]" />
              <h1 className="text-2xl font-bold sm:text-3xl">Ideas for {city || "your area"}{pincode ? ` · ${pincode}` : ""}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked for {[category && category !== "Any" ? category : "all categories", budget, risk && `${risk.toLowerCase()} risk`].filter(Boolean).join(" · ")}.
            </p>

            <div className="mt-6 space-y-3">
              {results.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card>
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                      <ScoreRing score={r.fit} size={72} label="Fit" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{r.name}</p>
                          <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>
                          {!r.withinBudget && (
                            <Badge className="bg-[color:var(--color-warning)]/20 text-foreground hover:bg-[color:var(--color-warning)]/20 text-[10px]">
                              Above budget
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{r.rationale}</p>
                        <ul className="mt-2 space-y-1">
                          {r.reasons.map((reason) => (
                            <li key={reason} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-teal)]" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Investment {money(r.investmentMin)}–{money(r.investmentMax)} · break-even {r.breakEvenMonths} mo
                        </p>
                        <Button
                          size="sm"
                          className="mt-3 bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
                          onClick={() => chooseIdea(r)}
                        >
                          Choose this idea
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => persist({ mode: "ai", focusOpportunityId: undefined })}
              className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Skip — just open my dashboard →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
