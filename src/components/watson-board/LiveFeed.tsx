import { liveFeed } from "@/data/data";
import { motion } from "framer-motion";

const tagColor: Record<string, string> = {
  evidence: "text-primary",
  alert: "text-danger",
  ai: "text-neon-2",
  forensic: "text-warn",
  officer: "text-success",
};

export function LiveFeed() {
  return (
    <div className="glass relative h-[360px] overflow-hidden rounded-xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Live Investigation Feed</div>
        <span className="flex items-center gap-1 text-[10px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-ring" /> live
        </span>
      </div>
      <div className="scanline pointer-events-none absolute inset-0 opacity-40" />
      <div className="space-y-1.5 overflow-y-auto pr-1 font-mono text-[12px]" style={{ height: "calc(100% - 28px)" }}>
        {liveFeed.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-2 border-l-2 border-border/60 pl-2 hover:border-primary/60"
          >
            <span className="w-14 shrink-0 text-muted-foreground">{f.t}</span>
            <span className={tagColor[f.tag] || ""}>›</span>
            <span className="text-foreground/90">{f.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
