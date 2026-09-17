import { Handle, Position, type NodeProps } from "reactflow";
import {
  User, UserX, Eye, Camera, Smartphone, Hammer,
  ClipboardList, Dna, Fingerprint, Banknote, Clock,
  Cloud, Users, FlaskConical, Skull, AlertTriangle,
  ShieldAlert, Activity, MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NodeZone } from "@/data/data";

// ── Icon + color registry ─────────────────────────────────────────────────────
const NODE_META: Record<string, { icon: LucideIcon; label: string }> = {
  victim:      { icon: Skull,         label: "Victim"      },
  suspect:     { icon: UserX,         label: "Suspect"     },
  witness:     { icon: Eye,           label: "Witness"     },
  cctv:        { icon: Camera,        label: "CCTV"        },
  phone:       { icon: Smartphone,    label: "Phone"       },
  weapon:      { icon: Hammer,        label: "Weapon"      },
  autopsy:     { icon: ClipboardList, label: "Autopsy"     },
  timeline:    { icon: Clock,         label: "TOD"         },
  dna:         { icon: Dna,           label: "DNA"         },
  fingerprint: { icon: Fingerprint,   label: "Fingerprint" },
  txn:         { icon: Banknote,      label: "Financial"   },
  weather:     { icon: Cloud,         label: "Weather"     },
  family:      { icon: Users,         label: "Family"      },
  toxicology:  { icon: FlaskConical,  label: "Toxicology"  },
  location:    { icon: MapPin,        label: "Location"    },
  evidence:    { icon: AlertTriangle, label: "Evidence"    },
};

const ZONE_COLORS: Record<NodeZone, { ring: string; glow: string; text: string; bg: string; badge: string }> = {
  victim:      { ring: "border-cyan-400/80",    glow: "shadow-[0_0_32px_rgba(34,211,238,0.55)]",  text: "text-cyan-200",    bg: "bg-cyan-950/60",    badge: "bg-cyan-500/20 text-cyan-300"    },
  suspect:     { ring: "border-red-500/80",     glow: "shadow-[0_0_28px_rgba(239,68,68,0.6)]",   text: "text-red-300",     bg: "bg-red-950/60",     badge: "bg-red-500/20 text-red-300"      },
  forensic:    { ring: "border-sky-400/70",     glow: "shadow-[0_0_22px_rgba(56,189,248,0.35)]", text: "text-sky-300",     bg: "bg-sky-950/55",     badge: "bg-sky-500/20 text-sky-300"      },
  timeline:    { ring: "border-violet-400/70",  glow: "shadow-[0_0_22px_rgba(167,139,250,0.35)]",text: "text-violet-300",  bg: "bg-violet-950/55",  badge: "bg-violet-500/20 text-violet-300" },
  environmental:{ ring: "border-emerald-400/70", glow: "shadow-[0_0_22px_rgba(52,211,153,0.30)]", text: "text-emerald-300", bg: "bg-emerald-950/50", badge: "bg-emerald-500/20 text-emerald-300"},
};

const RISK_BADGE: Record<string, string> = {
  critical: "bg-red-600/90 text-white",
  high:     "bg-orange-500/80 text-white",
  medium:   "bg-yellow-500/80 text-black",
  low:      "bg-green-600/80 text-white",
};

// ── Shared handle config ──────────────────────────────────────────────────────
function AllHandles({ color }: { color: string }) {
  const cls = `!h-1.5 !w-1.5 !border-0 ${color}`;
  return (
    <>
      <Handle type="source" position={Position.Bottom} className={cls} />
      <Handle type="target" position={Position.Top}    className={cls} />
      <Handle type="source" position={Position.Left}   className={cls} />
      <Handle type="source" position={Position.Right}  className={cls} />
      <Handle type="target" position={Position.Left}   className={cls} id="tl" />
      <Handle type="target" position={Position.Right}  className={cls} id="tr" />
    </>
  );
}

// ── Relation count badge ──────────────────────────────────────────────────────
function RelationBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center z-10">
      <span className="text-[8px] font-bold text-slate-300">{count}</span>
    </div>
  );
}

// ── AI generated badge ────────────────────────────────────────────────────────
function AIBadge() {
  return (
    <span className="ml-auto rounded bg-violet-600/40 px-1 py-0.5 text-[7px] font-bold text-violet-300 uppercase tracking-wide">
      AI
    </span>
  );
}

// ── Victim Node ───────────────────────────────────────────────────────────────
export function VictimNode({ data, selected }: NodeProps) {
  const z = ZONE_COLORS.victim;
  return (
    <div
      onContextMenu={data.onContextMenu}
      className={[
        "relative flex flex-col items-center rounded-2xl border-2 px-5 py-4 min-w-[210px] backdrop-blur-xl",
        "bg-gradient-to-b from-cyan-950/80 to-slate-950/90",
        z.ring,
        selected ? "ring-2 ring-cyan-300/60" : z.glow,
        "animate-victim-pulse transition-all duration-300",
      ].join(" ")}
    >
      <RelationBadge count={data.relationCount ?? 0} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl animate-victim-ring-outer" />
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-400/70 bg-cyan-900/60 shadow-[0_0_20px_rgba(34,211,238,0.5)]">
        <Skull className="h-6 w-6 text-cyan-300" />
      </div>
      <div className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-500/80 font-semibold">Victim · Case C-2041</div>
      <div className="text-base font-bold text-white tracking-wide">{data.label}</div>
      <div className="mt-0.5 text-[11px] text-cyan-300/80">{data.sublabel}</div>
      <div className="mt-3 w-full space-y-1.5 border-t border-cyan-800/60 pt-2">
        <Row label="TOD"     value={data.todRange}       color="text-cyan-300"   />
        <Row label="COD"     value={data.causeOfDeath}   color="text-red-300"    />
        <Row label="Autopsy" value={data.autopsyStatus}  color="text-emerald-300"/>
      </div>
      <div className="mt-2 w-full">
        <div className="flex justify-between text-[9px] text-cyan-500/70 mb-0.5">
          <span>CONFIDENCE</span><span>{data.confidence}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-cyan-950/80 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300" style={{ width: `${data.confidence}%` }} />
        </div>
      </div>
      <AllHandles color="!bg-cyan-400" />
    </div>
  );
}

// ── Suspect Node ──────────────────────────────────────────────────────────────
export function SuspectNode({ data, selected }: NodeProps) {
  const z = ZONE_COLORS.suspect;
  const riskBadge = RISK_BADGE[data.riskLevel ?? "medium"];
  return (
    <div
      onContextMenu={data.onContextMenu}
      className={[
        "relative rounded-xl border-2 px-3 py-2.5 min-w-[190px] backdrop-blur-xl",
        "bg-gradient-to-b from-red-950/80 to-slate-950/85",
        z.ring,
        selected ? "ring-2 ring-red-400/60" : z.glow,
        data.danger ? "animate-suspect-pulse" : "",
        "transition-all duration-300 group",
      ].join(" ")}
    >
      <RelationBadge count={data.relationCount ?? 0} />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/60 bg-red-900/50 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
          <UserX className="h-4 w-4 text-red-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-widest text-red-500/70 font-semibold">Suspect</div>
          <div className="truncate text-sm font-bold text-white leading-tight">{data.label}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${riskBadge}`}>{data.riskLevel}</span>
          {data.aiGenerated && <AIBadge />}
        </div>
      </div>
      <div className="text-[10px] text-red-300/70 mb-1.5 leading-snug">{data.sublabel}</div>
      {data.activityTag && (
        <div className="mb-1.5 inline-flex items-center gap-1 rounded border border-orange-500/40 bg-orange-900/30 px-1.5 py-0.5">
          <AlertTriangle className="h-2.5 w-2.5 text-orange-400" />
          <span className="text-[9px] text-orange-300 font-medium">{data.activityTag}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <ConfidenceBar pct={data.confidence} color="bg-red-400" label="AI Confidence" />
        {data.criminalCount != null && (
          <div className="text-center">
            <div className="text-[10px] font-bold text-orange-300">{data.criminalCount}</div>
            <div className="text-[8px] text-red-500/60">Prior</div>
          </div>
        )}
      </div>
      <AllHandles color="!bg-red-400" />
    </div>
  );
}

// ── Generic Zone Node (Forensic / Timeline / Environmental) ───────────────────
export function ZoneNode({ data, selected }: NodeProps) {
  const zone: NodeZone = data.zone ?? "forensic";
  const z = ZONE_COLORS[zone];
  const meta = NODE_META[data.type] ?? NODE_META.evidence;
  const Icon = meta.icon;
  return (
    <div
      onContextMenu={data.onContextMenu}
      className={[
        "relative rounded-xl border px-3 py-2 min-w-[175px] backdrop-blur-xl",
        "bg-slate-950/80",
        z.ring,
        selected ? "ring-1 ring-white/20" : z.glow,
        "transition-all duration-300 hover:scale-[1.02] group",
        data.aiGenerated ? "animate-node-spawn" : "",
      ].join(" ")}
    >
      <RelationBadge count={data.relationCount ?? 0} />
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${z.ring} bg-slate-900/70`}>
          <Icon className={`h-3.5 w-3.5 ${z.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[9px] uppercase tracking-widest font-semibold ${z.text} opacity-70`}>{meta.label}</div>
          <div className="truncate text-[12px] font-semibold text-white leading-tight">{data.label}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {data.danger && <ShieldAlert className="h-3 w-3 text-red-400 animate-pulse" />}
          {data.aiGenerated && <AIBadge />}
        </div>
      </div>
      {data.sublabel && (
        <div className={`text-[10px] ${z.text} opacity-70 leading-snug mb-1`}>{data.sublabel}</div>
      )}
      {data.meta && (
        <div className="font-mono text-[9px] text-slate-400/70 leading-snug">{data.meta}</div>
      )}
      {data.confidence != null && (
        <div className="mt-1.5">
          <ConfidenceBar pct={data.confidence} color={confColor(zone)} label="Confidence" />
        </div>
      )}
      {data.danger && (
        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
      )}
      <AllHandles color="!bg-slate-400" />
    </div>
  );
}

// ── EvidenceNode (router) ─────────────────────────────────────────────────────
export function EvidenceNode(props: NodeProps) {
  const zone: NodeZone = props.data?.zone ?? "forensic";
  if (zone === "victim")  return <VictimNode  {...props} />;
  if (zone === "suspect") return <SuspectNode {...props} />;
  return <ZoneNode {...props} />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Row({ label, value, color }: { label: string; value?: string; color?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 w-12 shrink-0 mt-0.5">{label}</span>
      <span className={`text-[10px] font-medium leading-snug ${color ?? "text-slate-300"}`}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between mb-0.5">
        <span className="text-[8px] text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[8px] text-slate-400 font-mono">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function confColor(zone: NodeZone): string {
  const map: Record<NodeZone, string> = {
    victim:       "bg-cyan-400",
    suspect:      "bg-red-400",
    forensic:     "bg-sky-400",
    timeline:     "bg-violet-400",
    environmental:"bg-emerald-400",
  };
  return map[zone];
}

export { Activity };
