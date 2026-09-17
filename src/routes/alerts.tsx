import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { liveFeed, contradictions } from "@/data/data";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Watson-Board" }, { name: "description", content: "AI alerts and contradictions." }] }),
  component: () => (
    <Shell>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Live Alerts</div>
          {liveFeed.filter(f => f.tag === "alert" || f.tag === "ai").map((f, i) => (
            <div key={i} className="border-l-2 border-danger/60 px-2 py-1 text-xs">
              <span className="mr-2 font-mono text-[10px] text-muted-foreground">{f.t}</span>{f.text}
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-4">
          <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Contradictions</div>
          {contradictions.map((c) => (
            <div key={c.id} className="rounded-md border border-danger/30 bg-danger/5 px-2 py-1.5 text-xs my-1">
              <span className="font-mono text-[10px] opacity-70">{c.id} · {c.severity}</span> — {c.text}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  ),
});
