import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/pricing")({
  head: () => ({ meta: [{ title: "Pricing & Plans — BizIntel" }] }),
  component: PricingPage,
});

function PricingPage() {
  const { user, updateUser } = useAuth();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const currentPlan = (user?.plan as PlanId) ?? "explorer";

  const choose = (id: PlanId) => {
    if (id === "enterprise") {
      toast.success("We'll be in touch about Enterprise soon.");
      return;
    }
    updateUser({ plan: id });
    toast.success(`You're on the ${PLANS.find((p) => p.id === id)?.name} plan.`);
  };

  return (
    <div>
      <PageHeader
        title="Plans & pricing"
        description="Simple, transparent pricing. Upgrade or downgrade anytime."
      />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex items-center justify-center">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-sm">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={cn(
                  "rounded-full px-4 py-1.5 font-medium capitalize transition",
                  cycle === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {c}
                {c === "yearly" && (
                  <Badge className="ml-2 bg-[color:var(--color-teal)]/20 text-[color:var(--color-navy)] text-[10px] hover:bg-[color:var(--color-teal)]/20">
                    Save 17%
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {PLANS.map((p, i) => {
            const isCurrent = p.id === currentPlan;
            const price = cycle === "monthly" ? p.priceMonthly : p.priceYearly;
            const suffix =
              p.id === "enterprise"
                ? ""
                : cycle === "monthly"
                  ? "/month"
                  : "/year";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className={cn(
                    "relative h-full",
                    p.highlight && "border-[color:var(--color-brand)] shadow-lg",
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--color-brand)] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-brand-foreground)]">
                      Most popular
                    </span>
                  )}
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{p.name}</p>
                        {isCurrent && (
                          <Badge className="bg-[color:var(--color-teal)]/20 text-[color:var(--color-navy)] text-[10px] hover:bg-[color:var(--color-teal)]/20">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {price}
                        <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
                      </p>
                    </div>
                    <ul className="flex-1 space-y-2 border-t border-border pt-4">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-teal)]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => choose(p.id)}
                      disabled={isCurrent}
                      className={cn(
                        "mt-2 w-full",
                        p.highlight
                          ? "bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
                          : "",
                      )}
                      variant={p.highlight ? "default" : "outline"}
                    >
                      {isCurrent ? "Current plan" : p.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Need something custom?</p>
                <p className="text-sm text-muted-foreground">
                  Enterprise deployments with SSO, custom AI models, and dedicated support.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => toast.success("Sales team notified.")}>
              Contact sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}