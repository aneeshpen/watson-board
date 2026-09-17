import { hypotheses } from "@/data/data";
import { Sparkles, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export function HypothesisPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-neon-2" />
          AI Hypothesis Engine
        </div>
        <span className="rounded-md bg-neon-2/15 px-1.5 py-0.5 font-mono text-[10px] text-neon-2">live</span>
      </div>
      {hypotheses.map((h, i) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground">{h.id}</div>
              <div className="text-sm font-medium">{h.title}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base text-primary">{h.confidence}%</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">conf</div>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-secondary">
            <div className="h-full bg-gradient-to-r from-neon-2 to-primary" style={{ width: `${h.confidence}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-success">
                <Check className="h-3 w-3" /> Supports
              </div>
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                {h.support.map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-danger">
                <X className="h-3 w-3" /> Against
              </div>
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                {h.against.map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
