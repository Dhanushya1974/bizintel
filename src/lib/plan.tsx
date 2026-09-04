import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { PLAN_LIMITS, PLANS, CURRENT_USAGE, type PlanId } from "@/lib/mock-data";

export function usePlan() {
  const { user } = useAuth();
  const plan: PlanId = (user?.plan as PlanId) ?? "explorer";
  const limits = PLAN_LIMITS[plan];
  const isFree = plan === "explorer";
  return { plan, limits, isFree, usage: CURRENT_USAGE };
}

export function LockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[color:var(--color-navy)]/90 px-2 py-0.5 text-[10px] font-semibold text-white",
        className,
      )}
    >
      <Lock className="h-3 w-3" /> PRO
    </span>
  );
}

type PremiumModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feature?: string;
};

export function PremiumModal({ open, onOpenChange, feature }: PremiumModalProps) {
  const { plan, usage, limits } = usePlan();
  const currentPlan = PLANS.find((p) => p.id === plan)!;
  const recommend = PLANS.find((p) => p.id === "pro")!;

  const usageRows = [
    { label: "AI chats today", used: usage.aiChatsToday, cap: limits.aiChatsPerDay },
    { label: "Business analyses this month", used: usage.businessAnalysesThisMonth, cap: limits.businessAnalysesPerMonth },
    { label: "Competitor analyses this month", used: usage.competitorAnalysesThisMonth, cap: limits.competitorAnalysesPerMonth },
    { label: "Saved projects", used: usage.savedProjects, cap: limits.savedProjects },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--color-brand)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-brand)]">
            <Sparkles className="h-3.5 w-3.5" /> Premium feature
          </div>
          <DialogTitle className="text-2xl">
            {feature ? `Unlock ${feature}` : "Upgrade to unlock premium"}
          </DialogTitle>
          <DialogDescription>
            You're on the <span className="font-medium text-foreground">{currentPlan.name}</span> plan. Upgrade to
            access the full BizIntel toolkit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your usage</p>
            <div className="mt-3 space-y-3">
              {usageRows.map((r) => {
                const capNum = r.cap === "unlimited" ? Infinity : (r.cap as number);
                const pct = r.cap === "unlimited" ? 10 : Math.min(100, (r.used / capNum) * 100);
                return (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-medium">
                        {r.used} / {r.cap === "unlimited" ? "∞" : r.cap}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1 h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--color-brand)]/40 bg-[color:var(--color-brand)]/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-brand)]">
                  Recommended
                </p>
                <p className="mt-1 text-lg font-bold">{recommend.name}</p>
                <p className="text-xs text-muted-foreground">{recommend.tagline}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{recommend.priceMonthly}</p>
                <p className="text-[11px] text-muted-foreground">per month</p>
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {recommend.features.slice(0, 6).map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-teal)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Link to="/pricing" className="flex-1">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Compare plans
            </Button>
          </Link>
          <Link to="/pricing" className="flex-1">
            <Button
              className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
              onClick={() => onOpenChange(false)}
            >
              Upgrade now
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Wraps children; if the current plan lacks access, clicking opens the premium modal instead. */
export function PremiumGate({
  locked,
  feature,
  children,
}: {
  locked: boolean;
  feature: string;
  children: (open: () => void, locked: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {children(() => setOpen(true), locked)}
      <PremiumModal open={open} onOpenChange={setOpen} feature={feature} />
    </>
  );
}

export function PlanBadge() {
  const { plan } = usePlan();
  const name = PLANS.find((p) => p.id === plan)?.name ?? "Explorer";
  return (
    <Badge
      variant="secondary"
      className="rounded-full bg-[color:var(--color-teal)]/15 text-[color:var(--color-navy)] text-[10px] font-semibold uppercase tracking-widest"
    >
      {name}
    </Badge>
  );
}