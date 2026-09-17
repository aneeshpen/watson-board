import { useState } from "react";
import { Sliders } from "lucide-react";

const SCENARIOS = [
  { id: "tod",   label: "Shift TOD by 2 hours",        delta: { confidence: -12, contradictions: +1 } },
  { id: "cctv",  label: "CCTV-0418 timestamp wrong",   delta: { confidence: +8,  contradictions: -2 } },
  { id: "spoof", label: "Suspect phone spoofed",       delta: { confidence: -18, contradictions: +2 } },
  { id: "w2",    label: "Remove Witness #2 statement", delta: { confidence: +4,  contradictions: -1 } },
];

export function WhatIfPanel({ baseConf = 87, baseContra = 4 }: { baseConf?: number; baseContra?: number }) {
  const [active, setActive] = useState<string[]>([]);
  const dC = active.reduce((a, id) => a + (SCENARIOS.find(s => s.id === id)!.delta.confidence), 0);
  const dX = active.reduce((a, id) => a + (SCENARIOS.find(s => s.id === id)!.delta.contradictions), 0);
  const conf = Math.max(0, Math.min(100, baseConf + dC));
  const contra = Math.max(0, baseContra + dX);

  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Sliders className="h-3.5 w-3.5 text-neon-2" /> What-If Simulation
      </div>
      <div className="space-y-1.5">
        {SCENARIOS.map((s) => {
          const on = active.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setActive((a) => on ? a.filter(x => x !== s.id) : [...a, s.id])}
              className={[
                "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs transition",
                on ? "border-neon-2/50 bg-neon-2/10 text-foreground" : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <span>{s.label}</span>
              <span className={`h-3 w-3 rounded-full border ${on ? "border-neon-2 bg-neon-2" : "border-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Suspect S-118 Conf.</div>
          <div className="font-mono text-lg text-primary">{conf}%</div>
        </div>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Contradictions</div>
          <div className="font-mono text-lg text-danger">{contra}</div>
        </div>
      </div>
    </div>
  );
}
