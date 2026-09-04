import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { askConsultant, buildContext } from "@/lib/consultant";
import type { ChatThread } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/consultant")({
  head: () => ({ meta: [{ title: "AI Consultant — BizIntel" }] }),
  component: Consultant,
});

const KEY = "bizintel.chat.threads";
const STARTERS = [
  "What's the strongest opportunity for my budget and city?",
  "Compare my top two options on demand vs competition.",
  "What are the biggest risks for my idea?",
  "Draft a 1-page investor summary for my top opportunity.",
];

function loadThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function saveThreads(t: ChatThread[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(t));
}

function Consultant() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = loadThreads();
    if (t.length === 0) {
      const seed: ChatThread = { id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [] };
      setThreads([seed]); setActiveId(seed.id); saveThreads([seed]);
    } else { setThreads(t); setActiveId(t[0].id); }
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [activeId, threads]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  const update = (next: ChatThread[]) => { setThreads(next); saveThreads(next); };

  const send = async (text: string) => {
    if (!text.trim() || !active) return;
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text.trim(), ts: Date.now() };
    const updatedTitle = active.messages.length === 0 ? text.trim().slice(0, 40) : active.title;
    const t1 = threads.map((t) => t.id === active.id ? { ...t, title: updatedTitle, messages: [...t.messages, userMsg], updatedAt: Date.now() } : t);
    update(t1); setInput(""); setThinking(true);
    const history = [
      ...active.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text.trim() },
    ];
    const { text: answer, provider } = await askConsultant(history, buildContext(user));
    setLastProvider(provider);
    const asstMsg = { id: crypto.randomUUID(), role: "assistant" as const, content: answer, ts: Date.now() };
    const t2 = t1.map((t) => t.id === active.id ? { ...t, messages: [...t.messages, asstMsg], updatedAt: Date.now() } : t);
    update(t2); setThinking(false);
  };

  const newThread = () => {
    const n: ChatThread = { id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [] };
    update([n, ...threads]); setActiveId(n.id);
  };
  const del = (id: string) => {
    const next = threads.filter((t) => t.id !== id);
    update(next.length ? next : [{ id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [] }]);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader title="AI Business Consultant" description="Ask anything about markets, locations, competitors or opportunities." />
      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-border bg-card md:flex md:flex-col">
          <div className="p-3">
            <Button className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90" onClick={newThread}>
              <Plus className="mr-1 h-4 w-4" /> New chat
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2">
            {threads.map((t) => (
              <div key={t.id} className={cn("group mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer", activeId === t.id ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]" : "hover:bg-secondary")} onClick={() => setActiveId(t.id)}>
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{t.title}</span>
                <button onClick={(e) => { e.stopPropagation(); del(t.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </ScrollArea>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8">
            {active && active.messages.length === 0 ? (
              <div className="mx-auto max-w-2xl text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"><Sparkles className="h-6 w-6" /></span>
                <h2 className="mt-4 text-xl font-semibold">How can I help today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try a starter or ask your own question.</p>
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-card p-3 text-left text-sm hover:border-[color:var(--color-brand)]/40 hover:bg-secondary/50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {active?.messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)]" : "bg-card border border-border")}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {thinking && (
                  <div className="flex justify-start"><div className="rounded-2xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground">Thinking…</div></div>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-border bg-card p-3 sm:p-4">
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto flex max-w-3xl items-end gap-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a market, location, or competitor…" className="min-h-[52px] max-h-40 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
              <Button type="submit" disabled={!input.trim() || thinking} className="h-[52px] bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {lastProvider && (
              <p className="mx-auto mt-2 max-w-3xl text-[11px] text-muted-foreground">
                {lastProvider === "offline"
                  ? "⚠ Offline — backend not reachable, using local estimates."
                  : lastProvider === "heuristic"
                    ? "Answered from BizIntel data (no LLM key set)."
                    : `Answered by ${lastProvider.replace(/^openai:|^anthropic:/, "")}`}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}