import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = [
  "Show strongest suspect",
  "Why is CCTV-0418 suspicious?",
  "Replay victim movements",
  "Find contradictions",
];

const REPLIES: Record<string, string> = {
  default:
    "Cross-referencing graph, autopsy, and timeline… The strongest suspect is S-118 (Vetri) at 87% confidence — supported by DNA match D-77 (99.2%), UPI ₹40,000 transfer at 20:22, and tower overlap during 20:14–20:51.",
  "Why is CCTV-0418 suspicious?":
    "CCTV-0418 shows a 6-minute timestamp drift vs the station master clock and produces an impossible travel-time chain (Central → Royapuram in 4m). Likelihood of tampering: 73%.",
  "Replay victim movements":
    "Loading reconstructed movement: Triplicane 18:10 → Central E-Gate 4 20:14 → altercation 20:42 → last ping 20:51. Suspect S-118 enters tower overlap by 20:22.",
  "Find contradictions":
    "4 contradictions detected: TOD vs witness #2; CCTV-0418 timestamp drift; impossible travel time; livor mortis pattern vs supine recovery position.",
  "Show strongest suspect":
    "Suspect S-118 'Vetri' — 87% confidence. Forensic ties: DNA, UPI lure pattern, tower overlap, defensive injuries on victim consistent with right-handed assailant.",
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
  const [log, setLog] = useState<{ who: "user" | "ai"; text: string }[]>([
    { who: "ai", text: "Watson-Board Copilot online. I have indexed 24 evidence items across C-2041. Ask me anything." },
  ]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;

    // Add user message immediately
    setLog((l) => [...l, { who: "user", text: t }]);
    setInput("");

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(t)}`);
      const data = await res.json();
      
      let reply = "";
      if (data.results && data.results.length > 0) {
        reply = "Here is the relevant evidence I retrieved from the vector database:\n\n";
        data.results.slice(0, 3).forEach((r: any, idx: number) => {
          reply += `[${r.metadata.type?.toUpperCase() || 'UNKNOWN'} | Confidence: ${r.metadata.confidence || 0}%]\n${r.document}\n\n`;
        });
      } else {
        reply = "I couldn't find any highly relevant evidence in the database for that query.";
      }
      
      setLog((l) => [...l, { who: "ai", text: reply.trim() }]);
    } catch (e) {
      setLog((l) => [...l, { who: "ai", text: "Error connecting to the Watson-Board Vector Database. Please ensure the backend is running." }]);
    }
  }, []);

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
            {variant === "embedded" ? "briefing session · C-2041" : "holographic assistant · online"}
          </div>
        </div>
        <Badge variant="secondary" className="hidden border border-primary/35 bg-secondary/40 sm:inline-flex">
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
            {m.text}
          </div>
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
