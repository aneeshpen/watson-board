import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { InvestigationGraph } from "@/components/watson-board/InvestigationGraph";
import { HypothesisPanel } from "@/components/watson-board/HypothesisPanel";
import { ContradictionPanel } from "@/components/watson-board/ContradictionPanel";
import { TimelineReplay } from "@/components/watson-board/TimelineReplay";
import { MovementMap } from "@/components/watson-board/MovementMap";
import { AutopsyPanel } from "@/components/watson-board/AutopsyPanel";
import { Copilot } from "@/components/watson-board/Copilot";
// import { WhatIfPanel } from "@/components/watson-board/WhatIfPanel";
import { cases, similarCases, evidenceVault } from "@/data/data";
import { ChevronLeft, GitBranch, Layers, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ReactFlowProvider } from "reactflow";

export const Route = createFileRoute("/cases/$caseId")({
  head: ({ params }) => ({
    meta: [
      { title: `Case ${params.caseId} — Watson-Board Investigation Workspace` },
      { name: "description", content: "Living evidence canvas, AI hypotheses, autopsy & timeline replay." },
    ],
  }),
  component: CaseWorkspace,
});

function CaseWorkspace() {
  const { caseId } = Route.useParams();
  const c = cases.find((x) => x.id === caseId) ?? cases[0];
  const [tab, setTab] = useState<  "timeline" | "autopsy" | "movement " | "graph">("autopsy");

  return (
    <Shell>
      <div className="space-y-4 p-5">
        {/* Case header */}
        <div className="glass-strong flex flex-wrap items-center gap-4 rounded-xl px-5 py-4">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              {c.id} · {c.fir} · {c.district}
              {c.flagged && <span className="flex items-center gap-1 text-danger"><ShieldAlert className="h-3 w-3" /> AI Flagged</span>}
            </div>
            <h1 className="text-xl font-semibold text-gradient">{c.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Lead Suspect Conf.</div>
              <div className="font-mono text-lg text-primary">{c.aiConfidence}%</div>
            </div>
            <div className="h-10 w-px bg-border/60" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Evidence</div>
              <div className="font-mono text-lg">{c.evidence}</div>
            </div>
            <div className="h-10 w-px bg-border/60" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Contradictions</div>
              <div className="font-mono text-lg text-danger">{c.contradictions}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {([
            { id: "autopsy",  label: "Forensic Body",          icon: Layers },
            { id: "timeline", label: "Timeline Replay",        icon: Layers },
            { id: "movement", label: "Movement Map",           icon: Layers },
            { id: "graph",    label: "Living Evidence Canvas", icon: GitBranch },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition",
                tab === t.id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className={`grid grid-cols-1 gap-4 ${tab === "graph" ? "xl:grid-cols-[1fr_360px]" : ""}`}>
          {/* Center stage */}
          <div className="space-y-4">
            {tab === "graph" && (
              <div className="glass relative h-[640px] overflow-hidden rounded-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border/40 bg-background/40 px-3 py-2 backdrop-blur">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Living Evidence Canvas · 15 nodes · 16 edges</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> link</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> suspicious</span>
                  </div>
                </div>
                <ReactFlowProvider>
                  <InvestigationGraph />
                </ReactFlowProvider>
              </div>
            )}
            {tab === "timeline" && <TimelineReplay />}
            {tab === "movement" && <MovementMap />}
            {tab === "autopsy" && <AutopsyPanel />}

            {/* Always-visible secondary insights */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="glass rounded-xl p-4">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Smart Evidence Prioritization</div>
                <div className="space-y-1.5">
                  {evidenceVault.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-md border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-xs">
                      <div className="font-mono text-[10px] text-muted-foreground">{e.id}</div>
                      <div className="flex-1 truncate">{e.name}</div>
                      <div className="hidden truncate text-[10px] text-muted-foreground sm:block max-w-[160px]">{e.ai}</div>
                      <div className="h-1 w-12 overflow-hidden rounded bg-secondary">
                        <div className="h-full bg-gradient-to-r from-warn to-danger" style={{ width: `${e.priority}%` }} />
                      </div>
                      <div className="font-mono text-[10px] text-foreground">{e.priority}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Cross-Case Memory · Similar Patterns</div>
                <div className="space-y-2">
                  {similarCases.map((s) => (
                    <div key={s.id} className="rounded-md border border-border/40 bg-secondary/20 p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium">{s.title}</div>
                        <div className="font-mono text-[10px] text-neon-2">{s.similarity}% match</div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.traits.map((t) => (
                          <span key={t} className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI narrative */}
            <div className="glass rounded-xl p-4">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">AI Narrative Reconstruction</div>
              <p className="text-sm leading-relaxed text-foreground/90">
                <span className="font-mono text-[10px] text-primary">Watson-Board ▸ </span>
                The victim arrived near Chennai Central Station at <b>20:14</b>. The suspect's device appeared within
                tower overlap <b>6 minutes later</b>. A UPI transfer of <b>₹40,000</b> from victim to S-118 was logged
                at 20:22, suggesting a planned meeting. CCTV-0412 captured an altercation at <b>20:42</b>, after which
                the victim's phone went silent at 20:51. Autopsy estimates time of death between <b>19:30 and 21:00</b>,
                consistent with the digital trail.
              </p>
            </div>
          </div>

          {/* Right rail — only visible on Living Evidence Canvas */}
          {tab === "graph" && (
          <aside className="space-y-4">
            <HypothesisPanel />
            <ContradictionPanel />
            {/* <WhatIfPanel baseConf={c.aiConfidence} baseContra={c.contradictions} /> */}
          </aside>
          )}
        </div>
      </div>
      <Copilot />
    </Shell>
  );
}
