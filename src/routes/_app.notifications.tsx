import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BizIntel" }] }),
  component: () => (
    <div>
      <PageHeader title="Notifications" description="Insights, alerts, and account activity." />
      <div className="space-y-2 p-4 sm:p-8">
        {NOTIFICATIONS.map((n) => (
          <Card key={n.id} className={cn(!n.read && "border-[color:var(--color-brand)]/40 bg-[color:var(--color-brand)]/5")}>
            <CardContent className="flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"><Bell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="font-medium">{n.title}</p><span className="text-xs text-muted-foreground">{n.time}</span></div><p className="text-sm text-muted-foreground">{n.body}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
});