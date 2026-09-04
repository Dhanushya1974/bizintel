import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — BizIntel" }] }),
  component: () => {
    const { user } = useAuth();
    return (
      <div>
        <PageHeader title="Profile" description="Your public workspace profile." />
        <div className="p-4 sm:p-8">
          <Card><CardContent className="flex items-center gap-4 p-6">
            <Avatar className="h-16 w-16"><AvatarFallback className="bg-[color:var(--color-brand)]/15 text-[color:var(--color-brand)] font-semibold">{user?.avatarInitials}</AvatarFallback></Avatar>
            <div><p className="text-lg font-semibold">{user?.name}</p><p className="text-sm text-muted-foreground">{user?.email}</p>{user?.company && <p className="text-xs text-muted-foreground">{user.company}</p>}</div>
          </CardContent></Card>
        </div>
      </div>
    );
  },
});