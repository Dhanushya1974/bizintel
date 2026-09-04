import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-[color:var(--color-surface)] lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[color:var(--color-navy)] p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[color:var(--color-brand)] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[color:var(--color-teal)] blur-3xl" />
        </div>
        <div className="relative z-10 flex h-full flex-col">
          <Logo variant="light" linkTo="/" />
          <div className="my-auto max-w-md">
            <h2 className="text-3xl font-bold leading-tight">
              Know before you commit.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              BizIntel ranks real business opportunities for any location using
              live competitor, demand and demographic signals — with the
              evidence behind every score.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-teal)]" />
                AI-ranked opportunities in minutes
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-teal)]" />
                Competitor maps and demand forecasts
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-teal)]" />
                Investor-grade reports, exportable to PDF
              </li>
            </ul>
          </div>
          <p className="relative z-10 text-xs text-white/50">
            © {new Date().getFullYear()} BizIntel. All rights reserved.
          </p>
        </div>
      </div>
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo linkTo="/" />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Home
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}