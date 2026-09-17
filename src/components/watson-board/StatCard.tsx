import { motion } from "framer-motion";
import { CountUp } from "./CountUp";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, tone = "primary", trend, sub,
}: {
  label: string; value: number; icon: LucideIcon;
  tone?: "primary" | "danger" | "warn" | "success" | "neon-2";
  trend?: string; sub?: string;
}) {
  const toneClass: Record<string, string> = {
    primary: "from-primary/30 to-primary/0 text-primary",
    danger:  "from-danger/30 to-danger/0 text-danger",
    warn:    "from-warn/30 to-warn/0 text-warn",
    success: "from-success/30 to-success/0 text-success",
    "neon-2":"from-neon-2/30 to-neon-2/0 text-neon-2",
  };
  const toneAccent: Record<string, string> = {
    primary: "border-l-primary/60",
    danger: "border-l-danger/60",
    warn: "border-l-warn/60",
    success: "border-l-success/60",
    "neon-2": "border-l-neon-2/60",
  };
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`glass relative overflow-hidden rounded-xl border-l-4 p-4 ${toneAccent[tone]}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${toneClass[tone]} blur-2xl opacity-60`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">
            <CountUp value={value} />
          </div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-lg border border-primary/35 bg-secondary/50 ${toneClass[tone].split(" ").pop()}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="h-1 w-12 overflow-hidden rounded bg-secondary">
            <span className="block h-full w-2/3 bg-primary animate-shimmer" />
          </span>
          {trend}
        </div>
      )}
    </motion.div>
  );
}
