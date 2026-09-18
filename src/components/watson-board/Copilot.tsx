import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { streamCopilot, type EvidenceSource } from "@/lib/api";
import { useCopilotStatus } from "@/hooks/use-api";

const SUGGESTIONS = [
  "Show strongest suspect",
  "Why is CCTV-0418 suspicious?",
  "Replay victim movements",
  "Find contradictions",
];

type ChatMessage = {
  who: "user" | "ai";
  text: string;
  sources?: EvidenceSource[];
  streaming?: boolean;
  error?: boolean;
};

export type CopilotHandle = {
  send: (text: string) => void;
};

export type CopilotProps = {
  variant?: "floating" | "embedded";
};

export const Copilot = forwardRef<CopilotHandle, CopilotProps>(function Copilot(
  { variant = "floating" },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { data: status } = useCopilotStatus();
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // The greeting used to hardcode "24 evidence items" while the corpus held 18.
  // It now reports whatever the backend actually indexed.
  const greeting =
    status?.mode === "rag"
      ? `Watson-Board Copilot online, grounded on the C-2041 evidence corpus. Answers cite their sources.`
      : `Watson-Board Copilot online in retrieval-only mode (no model key configured). I can surface matching evidence.`;

  const [log, setLog] = useState<ChatMessage[]>([{ who: "ai", text: "" }]);

  // Keep the opening line in sync with the backend's actual mode.
  useEffect(() => {
    setLog((l) =>
      l.length === 1 && l[0].who === "ai" && !l[0].sources ? [{ who: "ai", text: greeting }] : l,
    );
  }, [greeting]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLog((l) => [...l, { who: "user", text: t }, { who: "ai", text: "", streaming: true }]);
      setInput("");
      setBusy(true);

      const patchLast = (patch: Partial<ChatMessage>) =>
        setLog((l) => {
          const next = [...l];
          const i = next.length - 1;
          if (i >= 0 && next[i].who === "ai") next[i] = { ...next[i], ...patch };
          return next;
        });

      try {
        let answer = "";
        for await (const event of streamCopilot(t, controller.signal)) {
          if (event.type === "sources") {
            patchLast({ sources: event.sources });
          } else if (event.type === "delta") {
            answer += event.text;
            patchLast({ text: answer });
          } else if (event.type === "error") {
            patchLast({ text: event.message, error: true, streaming: false });
            return;
          }
        }
        patchLast({ streaming: false });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        patchLast({
          text: "Could not reach the Copilot service. Is the backend running?",
          error: true,
          streaming: false,
        });
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  useImperativeHandle(ref, () => ({ send }), [send]);

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/35 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium tracking-tight">Watson-Board Copilot</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {variant === "embedded"
              ? "briefing session · C-2041"
              : "holographic assistant · online"}
          </div>
        </div>
        <Badge
          variant="secondary"
          className="hidden border border-primary/35 bg-secondary/40 sm:inline-flex"
        >
          Live DB
        </Badge>
      </div>
      {variant === "floating" ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
          <X />
        </Button>
      ) : null}
    </div>
  );

  const transcript = (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {log.map((m, i) => (
        <div key={i} className={m.who === "user" ? "ml-auto max-w-[90%]" : "mr-auto max-w-[92%]"}>
          <div
            className={[
              "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
              m.who === "user"
                ? "bg-primary/18 text-foreground ring-1 ring-primary/20"
                : "border border-primary/30 bg-secondary/35 font-mono text-[12px] text-foreground/95",
            ].join(" ")}
          >
            {m.who === "ai" && (
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] text-primary">
                <span className="opacity-70">Watson-Board</span>
                <span className="text-muted-foreground">▸</span>
              </div>
            )}
            {m.error ? <span className="text-amber-300">{m.text}</span> : <span>{m.text}</span>}
            {m.streaming && (
              <span className="ml-1 inline-flex items-center gap-1 text-primary/80">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px]">{m.text ? "generating" : "searching evidence"}</span>
              </span>
            )}
          </div>

          {/* Grounding: every generated answer shows what it was built from. */}
          {m.who === "ai" && m.sources && m.sources.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                sources
              </span>
              {m.sources.map((src) => (
                <span
                  key={src.node_id}
                  title={src.document}
                  className="cursor-help rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary/90"
                >
                  {src.node_id}
                  {typeof src.confidence === "number" && (
                    <span className="ml-1 opacity-60">{src.confidence}%</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const composer = (
    <div className="shrink-0 border-t border-border/40 bg-secondary/20 px-3 pb-3 pt-2">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-primary/35 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/55 hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask Watson-Board…"
          className="h-10 flex-1 border-primary/35 bg-input/50 font-mono text-xs focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
        />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => send(input)}
          className="h-10 w-10 shrink-0 border border-primary/25 bg-primary/15 text-primary hover:bg-primary/25"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const shellClass =
    variant === "embedded"
      ? "flex h-full min-h-[min(560px,calc(100vh-10rem))] flex-col overflow-hidden rounded-2xl border-2 border-primary/45 bg-card scanline"
      : "glass-strong flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl";

  const inner = (
    <div className={shellClass}>
      {header}
      {transcript}
      {composer}
    </div>
  );

  if (variant === "embedded") {
    return inner;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-neon-2/55 bg-primary text-primary-foreground animate-float"
        aria-label={open ? "Close Watson-Board Copilot" : "Open Watson-Board Copilot"}
      >
        <Bot className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-20 right-5 z-40"
          >
            {inner}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
