import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Mic, Sparkles, Filter, ChevronDown, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { districts } from "@/data/data";
import { useDistrictFilter } from "@/contexts/DistrictFilterContext";
import { searchCommandBar } from "@/lib/command-search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommandHeader() {
  const { district, setDistrict } = useDistrictFilter();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hits = useMemo(() => searchCommandBar(query), [query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const scheduleClose = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setOpen(false), 160);
  };

  const cancelClose = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = null;
  };

  const goToHit = (to: string) => {
    cancelClose();
    navigate({ to });
    setQuery("");
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    cancelClose();
    const row = hits[highlight];
    if (row) {
      navigate({ to: row.to });
    } else {
      navigate({ to: "/copilot", search: { q: trimmed } });
    }
    setQuery("");
    setOpen(false);
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-primary/40 bg-background/60 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="neon-text font-mono text-sm tracking-[0.3em]">WATSON-BOARD</span>
        <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          v1.4 · KA+TN-Forensic
        </span>
      </div>

      <form className="relative ml-4 flex-1 max-w-2xl" onSubmit={onSubmit}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              cancelClose();
              setOpen(true);
            }}
            onBlur={scheduleClose}
            onKeyDown={(e) => {
              if (!showPanel || hits.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(hits.length - 1, h + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(0, h - 1));
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Search cases, suspects, FIR, autopsy ID, location, officer…"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="command-search-results"
            aria-autocomplete="list"
            className="h-10 w-full rounded-lg border border-primary/35 bg-input/50 pl-9 pr-44 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary"
              aria-label="Voice search (demo)"
            >
              <Mic className="h-4 w-4" />
            </motion.button>
            <Button
              asChild
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 bg-primary/15 px-2 text-xs text-primary hover:bg-primary/25"
              onMouseDown={cancelClose}
            >
              <Link to="/copilot" search={query.trim() ? { q: query.trim() } : {}}>
                <Sparkles className="h-3.5 w-3.5" /> Ask Watson-Board
              </Link>
            </Button>
          </div>

          {showPanel && (
            <div
              id="command-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-auto rounded-lg border border-primary/35 bg-popover py-1 shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              {hits.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-muted-foreground">
                  No registry matches. Press{" "}
                  <span className="font-mono text-foreground">Enter</span> to ask Copilot with this
                  query.
                </div>
              ) : (
                hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors",
                      i === highlight ? "bg-primary/15 text-foreground" : "hover:bg-secondary/60",
                    )}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => goToHit(h.to)}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{h.title}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-primary">
                        {h.kind}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{h.subtitle}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-secondary/40 px-2 py-1">
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <select
            aria-label="Filter maps and dashboards by district"
            value={district ?? ""}
            onChange={(e) => setDistrict(e.target.value || null)}
            className="max-w-[9rem] cursor-pointer bg-transparent py-0.5 text-xs outline-none"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <select className="rounded-md border border-primary/30 bg-secondary/40 px-2 py-1.5 text-xs">
          <option>All severities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button className="relative grid h-9 w-9 place-items-center rounded-md border border-primary/30 bg-secondary/40 hover:text-primary">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger animate-pulse-ring-danger" />
        </button>
      </div>
    </header>
  );
}
