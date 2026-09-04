import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "dark",
  linkTo = "/dashboard",
}: {
  className?: string;
  variant?: "dark" | "light";
  linkTo?: string;
}) {
  const fg = variant === "light" ? "#ffffff" : "#14213D";
  const accent = "#4A7FE3";
  const teal = "#00C2A8";
  return (
    <Link
      to={linkTo}
      className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}
    >
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect x="6" y="16" width="4" height="10" rx="1" fill={variant === "light" ? "#A9C9F4" : "#A9C9F4"} />
        <rect x="12" y="10" width="4" height="16" rx="1" fill={accent} />
        <rect x="18" y="6" width="4" height="20" rx="1" fill={variant === "light" ? "#A9C9F4" : "#A9C9F4"} />
        <path d="M22 12 l2 4 4-7" stroke={teal} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ color: fg }} className="text-[15px] font-extrabold">
        BIZ<span style={{ color: accent }}>INTEL</span>
      </span>
    </Link>
  );
}