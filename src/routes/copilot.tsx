import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Shell } from "@/components/watson-board/Shell";
import { Copilot, type CopilotHandle } from "@/components/watson-board/Copilot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { contradictions, evidenceVault } from "@/data/data";
import { ChevronRight, FileText, Zap } from "lucide-react";

const BRIEF_PROMPTS = [
  {
    title: "Strongest suspect",
    prompt: "Show strongest suspect",
    hint: "DNA + finance + tower overlap",
  },
  {
    title: "CCTV anomaly",
    prompt: "Why is CCTV-0418 suspicious?",
    hint: "Timestamp drift & chain",
  },
  {
    title: "Movement replay",
    prompt: "Replay victim movements",
    hint: "Reconstructed path",
  },
  {
    title: "Contradictions",
    prompt: "Find contradictions",
    hint: "Cross-domain conflicts",
  },
  {
    title: "Evidence digest",
    prompt:
      "Summarize highest-risk evidence for C-2041 in 5 bullets — cite IDs like EV-00x where possible.",
    hint: "Executive-style list",
  },
] as const;

type CopilotSearch = { q?: string };

function CopilotRoutePage() {
  const { q } = Route.useSearch();
  const copilotRef = useRef<CopilotHandle>(null);
  const lastSent = useRef<string | undefined>(undefined);

  useEffect(() => {
    const trimmed = q?.trim();
    if (!trimmed) {
      lastSent.current = undefined;
      return;
    }
    if (lastSent.current === trimmed) return;
    lastSent.current = trimmed;
    const id = requestAnimationFrame(() => copilotRef.current?.send(trimmed));
    return () => cancelAnimationFrame(id);
  }, [q]);

  return (
    <Shell>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-0 lg:flex-row lg:gap-0">
        {/* Primary: embedded session */}
        <div className="relative flex min-h-0 flex-1 flex-col border-border/30 lg:border-r lg:pr-4">
          <div className="shrink-0 border-b border-border/25 px-4 py-4 lg:border-b-0 lg:px-5 lg:pb-3 lg:pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-gradient">
                Copilot session
              </h1>
              <Badge variant="outline" className="border-primary/30 font-mono text-[10px]">
                C-2041
              </Badge>
              <span className="text-xs text-muted-foreground">
                Investigation briefing · evidence corpus
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Chat runs in-page. Use the rail for one-click prompts; elsewhere in the app the
              floating assistant stays available on case views.
            </p>
          </div>
          <div className="min-h-0 flex-1 px-4 pb-4 lg:px-5 lg:pb-5">
            <Copilot ref={copilotRef} variant="embedded" />
          </div>
        </div>

        {/* Briefing rail */}
        <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-border/30 bg-secondary/10 px-4 py-5 lg:w-[300px] lg:border-t-0 lg:bg-transparent lg:pl-5 lg:pr-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Briefing rail
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Launch prompts into the active session.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {BRIEF_PROMPTS.map(({ title, prompt, hint }) => (
              <button
                key={title}
                type="button"
                onClick={() => copilotRef.current?.send(prompt)}
                className="group flex w-full items-start gap-3 rounded-xl border border-border/45 bg-card/40 px-3 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {title}
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
                </div>
              </button>
            ))}
          </div>

          <Separator className="bg-border/50" />

          <div className="rounded-xl border border-border/45 bg-card/35 p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Corpus snapshot
            </div>
            <dl className="mt-3 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Evidence items</dt>
                <dd>{evidenceVault.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Open contradictions</dt>
                <dd className="text-warn">{contradictions.length}</dd>
              </div>
            </dl>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-8 w-full text-xs text-muted-foreground hover:text-primary"
              onClick={() => copilotRef.current?.send("Find contradictions")}
            >
              Ask about contradictions
            </Button>
          </div>
        </aside>
      </div>

      {/* Case detail pages keep the FAB; this route is full-page chat */}
    </Shell>
  );
}

export const Route = createFileRoute("/copilot")({
  validateSearch: (raw: Record<string, unknown>): CopilotSearch => ({
    q: typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Copilot — Watson-Board" },
      { name: "description", content: "Holographic investigation assistant." },
    ],
  }),
  component: CopilotRoutePage,
});
