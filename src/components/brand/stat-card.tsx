import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "default",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  tone?: "default" | "up" | "down";
  className?: string;
}) {
  const deltaColor =
    tone === "up"
      ? "text-[color:var(--color-success)]"
      : tone === "down"
      ? "text-destructive"
      : "text-muted-foreground";
  return (
    <Card className={cn("border-border/70 shadow-sm", className)}>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {delta && <p className={cn("mt-1 text-xs font-medium", deltaColor)}>{delta}</p>}
        </div>
        {Icon && (
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-[color:var(--color-brand)]">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}