import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("bizintel.user");
    if (user || stored) navigate({ to: "/dashboard", replace: true });
    else navigate({ to: "/signin", replace: true });
  }, [user, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-surface)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--color-brand)] border-t-transparent" />
    </div>
  );
}
