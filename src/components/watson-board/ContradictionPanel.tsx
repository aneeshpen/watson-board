import { contradictions } from "@/data/data";
import { AlertTriangle } from "lucide-react";

const sev: Record<string, string> = {
  critical: "border-danger/60 bg-danger/15 text-danger animate-pulse-ring-danger",
  high:     "border-danger/40 bg-danger/10 text-danger",
  medium:   "border-warn/40 bg-warn/10 text-warn",
};

export function ContradictionPanel() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-danger" /> Contradictions Detected
      </div>
      {contradictions.map((c) => (
        <div key={c.id} className={`rounded-lg border px-3 py-2 text-xs ${sev[c.severity]}`}>
          <div className="font-mono text-[10px] opacity-70">{c.id} · {c.severity.toUpperCase()}</div>
          <div className="mt-0.5 text-foreground/90">{c.text}</div>
        </div>
      ))}
    </div>
  );
}
