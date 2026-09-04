import * as React from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { PLANS } from "@/lib/mock-data";
import { usePlan } from "@/lib/plan";

const NAV: { label: string; to: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Opportunities", to: "/opportunities", icon: Target },
  { label: "Collaborations", to: "/collaborations", icon: Handshake },
  { label: "Projects & Reports", to: "/projects", icon: FileText },
];

const SECONDARY: { label: string; to: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Plans & Billing", to: "/pricing", icon: CreditCard },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Help & Support", to: "/help", icon: HelpCircle },
];

function NavItem({
  to,
  label,
  icon: Icon,
  badge,
  active,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-[color:var(--color-brand)]" : "")} />
      <span className="flex-1">{label}</span>
      {badge && (
        <Badge
          variant="secondary"
          className="h-5 rounded-full bg-[color:var(--color-teal)]/20 px-2 text-[10px] font-semibold text-[color:var(--color-foreground)]"
        >
          {badge}
        </Badge>
      )}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const { plan, isFree } = usePlan();
  const planName = PLANS.find((p) => p.id === plan)?.name ?? "Explorer";
  return (
    <nav className="flex h-full flex-col gap-6 p-4">
      <Logo />
      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>
        {NAV.map((n) => (
          <NavItem key={n.to} {...n} active={isActive(n.to)} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        {SECONDARY.map((n) => (
          <NavItem key={n.to} {...n} active={isActive(n.to)} onNavigate={onNavigate} />
        ))}
        {isFree && (
          <Link
            to="/pricing"
            onClick={onNavigate}
            className="mt-2 flex flex-col gap-1 rounded-xl bg-[color:var(--color-navy)] p-3 text-white"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-teal)]">
              <Zap className="h-3 w-3" /> {planName} plan
            </div>
            <p className="text-sm font-semibold">Upgrade to unlock premium</p>
            <p className="text-[11px] text-white/70">Unlimited AI, live market data & reports.</p>
          </Link>
        )}
      </div>
    </nav>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-secondary">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[color:var(--color-brand)]/15 text-[color:var(--color-brand)] text-xs font-semibold">
              {user.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/help" })}>Help & support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            navigate({ to: "/signin" });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[color:var(--color-brand)]" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <span className="text-xs font-normal text-muted-foreground">{unread} unread</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NOTIFICATIONS.slice(0, 4).map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium">{n.title}</span>
              <span className="text-[10px] text-muted-foreground">{n.time}</span>
            </div>
            <span className="text-xs text-muted-foreground">{n.body}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/notifications" })}>
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ onMenu }: { onMenu?: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6 print:hidden">
      <button
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary lg:hidden"
        onClick={onMenu}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search locations, competitors, reports…"
          className="pl-9"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          className="hidden gap-1.5 bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90 sm:inline-flex"
          onClick={() => navigate({ to: "/analysis/new" })}
        >
          <Plus className="h-4 w-4" /> New analysis
        </Button>
        <Link
          to="/consultant"
          aria-label="AI consultant"
          title="AI consultant"
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground data-[status=active]:bg-[color:var(--color-brand)]/10 data-[status=active]:text-[color:var(--color-brand)]"
        >
          <Sparkles className="h-4 w-4" />
        </Link>
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}

export function AppShell() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (user && !user.onboarded) navigate({ to: "/setup" });
  }, [user, navigate]);

  if (!user || !user.onboarded) return null;
  return (
    <div className="flex min-h-screen w-full bg-[color:var(--color-surface)]">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block print:hidden">
        <SidebarNav />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="min-w-0 flex-1 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}