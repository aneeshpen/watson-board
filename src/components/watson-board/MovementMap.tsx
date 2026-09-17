import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, CheckCircle, ChevronRight, MapPin } from "lucide-react";
import { heatmapZones, movementPath, crimeScene } from "@/data/data";
import { useDistrictFilter } from "@/contexts/DistrictFilterContext";
import { MapInteractChrome } from "@/components/watson-board/MapInteractChrome";
import { fetchMovement, type MovementPoint } from "@/lib/api";
import { cn } from "@/lib/utils";

const MOVEMENT_DISTRICT = "Bengaluru";

function buildMap(container: HTMLDivElement, points: MovementPoint[]) {
  const map = L.map(container, {
    center: [12.9716, 77.5946], zoom: 14,
    scrollWheelZoom: true, zoomControl: false, attributionControl: false,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  const victim  = points.filter(p => p.type === "victim");
  const suspect = points.filter(p => p.type === "suspect");
  const crime   = points.filter(p => p.type === "crime");

  if (victim.length > 1)
    L.polyline(victim.map(p => [p.lat, p.lng] as [number, number]), {
      color: "#5fd4ff", weight: 3, opacity: 0.9, dashArray: "6 6",
    }).addTo(map);

  if (suspect.length > 1)
    L.polyline(suspect.map(p => [p.lat, p.lng] as [number, number]), {
      color: "#ff4d6d", weight: 3, opacity: 0.9,
    }).addTo(map);

  const colorMap: Record<string, string> = { victim: "#5fd4ff", suspect: "#ff4d6d", crime: "#f59e0b" };
  [...victim, ...suspect, ...crime].forEach(p => {
    const c = colorMap[p.type ?? "victim"] ?? "#ffffff";
    L.circleMarker([p.lat, p.lng], { radius: 5, color: c, fillColor: c, fillOpacity: 0.9, weight: 2 })
      .bindTooltip(`${p.label} · ${p.time}`, { direction: "top" }).addTo(map);
  });

  return map;
}

function legacyToPoints(path: typeof movementPath): MovementPoint[] {
  return path.map(p => ({
    lat: p.lat, lng: p.lng, label: p.action, time: p.t,
    type: p.who === "victim" ? "victim" : "suspect",
  }));
}

// ── Upload modal ───────────────────────────────────────────────────────────

function UploadModal({ onFile, onClose }: { onFile: (f: File) => void; onClose: () => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[600] flex items-center justify-center rounded-xl"
      style={{ background: "rgba(2,6,20,0.94)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="w-[380px] rounded-2xl border border-cyan-500/30 bg-[#060e26] p-6 shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(34,211,238,0.1)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-cyan-400">Add Mobile GPS Log Data</div>
            <div className="text-[9px] text-slate-500 mt-0.5">CSV, JSON, or any format · routes auto-rendered</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-7 cursor-pointer transition-all ${
            drag ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5"
          }`}
        >
          <motion.div animate={{ y: drag ? -4 : 0 }} transition={{ duration: 0.2 }}>
            <MapPin className={`h-10 w-10 transition-colors ${drag ? "text-cyan-400" : "text-slate-500"}`} />
          </motion.div>
          <div className="text-center">
            <div className={`text-[11px] font-semibold transition-colors ${drag ? "text-cyan-300" : "text-slate-400"}`}>
              {drag ? "Release to import GPS log" : "Drag & drop GPS log file"}
            </div>
            <div className="text-[9px] text-slate-600 mt-1">or click to browse files</div>
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          {drag && (
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <motion.div className="absolute left-0 right-0 h-10"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(34,211,238,0.3), transparent)" }}
                animate={{ top: ["0%", "100%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {["Victim route (cyan)","Suspect route (red)","Crime scene marker","Tower pings","Time-stamped markers","Movement replay"].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <div className="h-1 w-1 rounded-full bg-cyan-500/60" />{f}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Simulation overlay ─────────────────────────────────────────────────────

type SimPhase = "idle" | "parsing" | "extracting" | "rendering" | "complete";

const SIM_STEPS: { phase: Exclude<SimPhase,"idle"|"complete">; label: string; pct: number }[] = [
  { phase: "parsing",    label: "Parsing GPS coordinates", pct: 30 },
  { phase: "extracting", label: "Extracting timestamps",   pct: 65 },
  { phase: "rendering",  label: "Rendering routes",        pct: 90 },
];

function SimOverlay({ phase, fileName, progress, onDismiss }: {
  phase: SimPhase; fileName: string; progress: number; onDismiss: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[600] flex items-center justify-center rounded-xl"
      style={{ background: "rgba(2,6,20,0.96)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-sm px-6 py-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30">
            <MapPin className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-black uppercase tracking-[0.15em] text-cyan-400">
              {phase === "complete" ? "Routes Ready" : "Processing GPS Data"}
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{fileName}</div>
          </div>
          {phase === "complete" && (
            <button onClick={onDismiss} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          )}
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1.5">
            <span className="uppercase tracking-wider">{phase === "complete" ? "Done" : "Processing…"}</span>
            <span className="font-mono text-cyan-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        <div className="space-y-2">
          {SIM_STEPS.map((s, i) => {
            const done = progress >= s.pct;
            const active = phase === s.phase;
            return (
              <div key={s.phase} className="flex items-center gap-2.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  done ? "border-emerald-500 bg-emerald-950/60" : active ? "border-cyan-500 bg-cyan-950/40" : "border-white/10"}`}>
                  {done ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                        : active ? <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
                        : <span className="text-[8px] text-slate-600">{i + 1}</span>}
                </div>
                <span className={`text-[10px] ${done ? "text-emerald-400" : active ? "text-cyan-300" : "text-slate-600"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {phase === "complete" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-emerald-400">Movement Map Ready</div>
              <div className="text-[9px] text-slate-500">Victim · Suspect · Crime scene routes plotted</div>
            </div>
            <button onClick={onDismiss}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              View Map <ChevronRight className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function MovementMap() {
  const { district: districtFilter } = useDistrictFilter();
  const ref = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [points, setPoints] = useState<MovementPoint[]>(legacyToPoints(movementPath));

  const [dataLoaded, setDataLoaded] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [simPhase, setSimPhase] = useState<SimPhase>("idle");
  const [simProgress, setSimProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const isSimulating = simPhase !== "idle";

  const showReplay = districtFilter === null || districtFilter === MOVEMENT_DISTRICT;

  useEffect(() => {
    fetchMovement("C-2041")
      .then(r => setPoints(r.movement))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const effectivePoints = (showReplay && dataLoaded) ? points : [];
    const map = buildMap(ref.current, effectivePoints);
    mapRef.current = map;

    // Always place the crime scene marker for the primary case district
    if (!districtFilter || districtFilter === MOVEMENT_DISTRICT) {
      const csMarker = L.circleMarker([crimeScene.lat, crimeScene.lng], {
        radius: 11, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.92, weight: 3,
      });
      csMarker.bindTooltip(
        `<div style="font-size:11px"><b>Crime Scene</b><br/>${crimeScene.label}</div>`,
        { direction: "top" },
      );
      csMarker.addTo(map);
    }

    if (!showReplay && districtFilter) {
      const z = heatmapZones.find(x => x.district === districtFilter);
      if (z) map.setView([z.lat, z.lng], 11);
      else map.setView([15.3173, 75.7139], 7);
    }

    return () => { mapRef.current = null; map.remove(); };
  }, [points, showReplay, districtFilter, dataLoaded]);

  async function handleFile(file: File) {
    setShowUpload(false);
    setFileName(file.name);
    setSimPhase("parsing"); setSimProgress(10);
    await new Promise(r => setTimeout(r, 900));
    setSimProgress(30);
    await new Promise(r => setTimeout(r, 500));
    setSimPhase("extracting"); setSimProgress(50);
    await new Promise(r => setTimeout(r, 900));
    setSimProgress(65);
    await new Promise(r => setTimeout(r, 400));
    setSimPhase("rendering"); setSimProgress(80);
    await new Promise(r => setTimeout(r, 900));
    setSimProgress(100);
    setSimPhase("complete");
  }

  function handleDismiss() {
    setSimPhase("idle");
    setDataLoaded(true);
  }

  return (
    <div ref={shellRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border/50 bg-background",
        fullscreen ? "h-screen max-h-[100dvh] rounded-none" : "h-[500px]",
      )}
    >
      <div ref={ref} className="h-full w-full min-h-[200px]" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-primary/20" />
      <MapInteractChrome shellRef={shellRef} mapRef={mapRef} onFullscreenChange={setFullscreen} />

      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="absolute top-3 right-16 z-[500] flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-[#060e26]/90 px-3 py-1.5 text-[10px] font-bold text-cyan-300 backdrop-blur-sm transition-all hover:bg-cyan-500/20"
        style={{ boxShadow: "0 0 16px rgba(34,211,238,0.15)" }}
      >
        {isSimulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        Add Mobile GPS Log Data
      </button>

      {/* Legend — crime scene always shown; routes shown once data is loaded */}
      {(!districtFilter || districtFilter === MOVEMENT_DISTRICT) && (
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-5rem)] flex flex-col gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-2 text-[10px] backdrop-blur shadow-xl">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_#f59e0b]" style={{ backgroundColor: "#f59e0b" }} />
            <span className="font-semibold text-amber-400">Crime Scene</span>
          </span>
          {dataLoaded && (
            <>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full shadow-[0_0_8px_#5fd4ff]" style={{ backgroundColor: "#5fd4ff" }} /> Victim</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full shadow-[0_0_8px_#ff4d6d]" style={{ backgroundColor: "#ff4d6d" }} /> Suspect (S-118)</span>
            </>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      <AnimatePresence>
        {!dataLoaded && !isSimulating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/20 bg-black/70 px-8 py-5 backdrop-blur-sm text-center"
              style={{ boxShadow: "0 0 40px rgba(34,211,238,0.06)" }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/50"
                style={{ boxShadow: "0 0 20px rgba(34,211,238,0.15)" }}>
                <MapPin className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-400">Import GPS Log Data</div>
                <div className="mt-1 text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                  Crime scene plotted. Upload GPS log data to overlay movement routes.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showReplay && districtFilter && dataLoaded && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-16 z-[500] rounded-md border border-primary/35 bg-background/85 px-3 py-2 text-center text-[11px] text-muted-foreground backdrop-blur">
          Movement replay is only modeled for <span className="font-medium text-foreground">{MOVEMENT_DISTRICT}</span> (C-2041).
          Map centered on <span className="font-medium text-foreground">{districtFilter}</span>.
        </div>
      )}

      <AnimatePresence>
        {showUpload && !isSimulating && (
          <UploadModal key="upload" onFile={handleFile} onClose={() => setShowUpload(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSimulating && (
          <SimOverlay key="sim" phase={simPhase} fileName={fileName} progress={simProgress} onDismiss={handleDismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}
