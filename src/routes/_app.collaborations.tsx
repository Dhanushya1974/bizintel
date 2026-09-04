import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Bookmark, Building2, CheckCircle2, Handshake, MapPin, MessageSquare, Send, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLLABORATIONS, COLLAB_REQUESTS, type CollabRequest } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/collaborations")({
  head: () => ({ meta: [{ title: "Collaborations — BizIntel" }] }),
  component: CollaborationsPage,
});

function CollaborationsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [requested, setRequested] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [requests, setRequests] = useState<CollabRequest[]>(COLLAB_REQUESTS);

  const categories = Array.from(new Set(COLLABORATIONS.map((c) => c.category)));
  const list = COLLABORATIONS.filter(
    (c) =>
      (category === "all" || c.category === category) &&
      (query === "" || c.business.toLowerCase().includes(query.toLowerCase())),
  );

  const respond = (id: string, status: "accepted" | "declined") => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(status === "accepted" ? "Request accepted" : "Request declined");
  };

  return (
    <div>
      <PageHeader
        title="Collaboration Center"
        description="AI-matched business partners that can help you grow — no feeds, no noise."
        actions={
          <Badge className="bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)] hover:bg-[color:var(--color-brand)]/10">
            <Sparkles className="mr-1 h-3 w-3" /> AI matched
          </Badge>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList>
            <TabsTrigger value="discover">
              <Handshake className="mr-1.5 h-4 w-4" /> Discover ({list.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <MessageSquare className="mr-1.5 h-4 w-4" /> Requests ({requests.filter((r) => r.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="mr-1.5 h-4 w-4" /> Saved ({saved.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search partners…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c, i) => {
                const isRequested = requested.includes(c.id);
                const isSaved = saved.includes(c.id);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="h-full">
                      <CardContent className="flex h-full flex-col gap-4 p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-sm font-semibold text-[color:var(--color-brand)]">
                              {c.logoInitials}
                            </span>
                            <div>
                              <p className="font-semibold">{c.business}</p>
                              <p className="text-xs text-muted-foreground">{c.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Match</p>
                            <p className="text-lg font-bold text-[color:var(--color-brand)]">{c.compatibility}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {c.location}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Why it's a fit
                            </p>
                            <p className="mt-0.5 text-foreground">{c.reason}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Expected benefit
                            </p>
                            <p className="mt-0.5 text-foreground">{c.benefit}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setRequested((r) => (r.includes(c.id) ? r : [...r, c.id]));
                              toast.success(`Request sent to ${c.business}`);
                            }}
                            disabled={isRequested}
                            className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            {isRequested ? "Requested" : "Request"}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Building2 className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSaved((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))
                            }
                          >
                            <Bookmark className={`mr-1 h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                            {isSaved ? "Saved" : "Save"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.from}</p>
                      <Badge variant="secondary" className="text-[10px]">{r.business}</Badge>
                      {r.status === "accepted" && (
                        <Badge className="bg-[color:var(--color-teal)]/20 text-[color:var(--color-navy)] text-[10px] hover:bg-[color:var(--color-teal)]/20">
                          Accepted
                        </Badge>
                      )}
                      {r.status === "declined" && (
                        <Badge variant="secondary" className="text-[10px]">Declined</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{r.time}</p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(r.id, "accepted")} className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respond(r.id, "declined")}>
                        <XCircle className="mr-1 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="saved">
            {saved.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Nothing saved yet</CardTitle>
                  <CardDescription>Bookmark partners from the Discover tab to review them later.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COLLABORATIONS.filter((c) => saved.includes(c.id)).map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-sm font-semibold text-[color:var(--color-brand)]">
                        {c.logoInitials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.business}</p>
                        <p className="text-xs text-muted-foreground">{c.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-[color:var(--color-brand)]">{c.compatibility}%</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}