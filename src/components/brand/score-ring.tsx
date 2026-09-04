import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 96,
  label,
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = size <= 72 ? 6 : 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const color =
    clamped >= 80 ? "#00C2A8" : clamped >= 65 ? "#4A7FE3" : clamped >= 50 ? "#E9B949" : "#E36A5C";
  return (
    <div className={cn("inline-flex flex-col items-center justify-center", className)} style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#E5E9F2"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{clamped}</span>
          {label && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}