import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  type Node, type Edge,
  EdgeLabelRenderer, getBezierPath,
  type EdgeProps,
} from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Brain, AlertTriangle, Clock, ShieldCheck, TrendingUp,
  Plus, Link2, UserX, Eye, FileText, Trash2,
  MapPin, GitBranch, Siren, Users,
} from "lucide-react";
import {
  caseGraph, type ForensicNode, type ForensicEdge,
  type RelationType, type NodeZone,
} from "@/data/data";
import { EvidenceNode } from "./EvidenceNode";

// ── Extended types ────────────────────────────────────────────────────────────
interface LiveNode extends ForensicNode { aiGenerated?: boolean }
interface LiveEdge extends ForensicEdge {}

type RelationFlowState =
  | null
  | { step: "pick-source" }
  | { step: "pick-target"; sourceId: string }
  | { step: "configure"; sourceId: string; targetId: string };

interface ContextMenuState { x: number; y: number; nodeId: string }

interface AddNodeForm {
  category: "evidence" | "suspect" | "witness" | "location";
  type: string;
  label: string;
  sublabel: string;
  confidence: number;
  riskLevel: string;
  targetNodeId: string;
  relationType: RelationType;
  edgeLabel: string;
  aiInsight: string;
  timestamp: string;
}

// ── Smart Clustered Layout ────────────────────────────────────────────────────
function computeLayout(
  nodes: LiveNode[],
  edges: LiveEdge[],
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const victim = nodes.find(n => n.zone === "victim");
  if (!victim) {
    nodes.forEach((n, i) => pos.set(n.id, { x: i * 240, y: 0 }));
    return pos;
  }
  pos.set(victim.id, { x: 0, y: 0 });

  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  // Primary suspects – east sector
  const suspects = nodes.filter(n => n.zone === "suspect" && n.type === "suspect");
  suspects.forEach((s, i) => {
    const angle = -0.3 * Math.PI + (i * 0.6 / Math.max(suspects.length - 1, 1)) * Math.PI;
    pos.set(s.id, { x: Math.cos(angle) * 370, y: Math.sin(angle) * 290 });
  });

  // Suspect-zone evidence (txn, phone…) – cluster near owning suspect
  const suspectIds = new Set(suspects.map(s => s.id));
  const suspOthers = nodes.filter(n => n.zone === "suspect" && !suspectIds.has(n.id));
  suspOthers.forEach((n, i) => {
    const neighbors = adj.get(n.id) ?? [];
    const host = suspects.find(s => neighbors.includes(s.id));
    if (host && pos.has(host.id)) {
      const sp = pos.get(host.id)!;
      const offsets = [[0.2, 180, 100], [-0.5, 160, -120], [0.8, 140, 130], [-1.0, 170, -90]];
      const [a, dx, dy] = offsets[i % offsets.length] as [number, number, number];
      void a;
      pos.set(n.id, { x: sp.x + dx, y: sp.y + dy });
    } else {
      pos.set(n.id, { x: 540, y: i * 140 - 70 });
    }
  });

  // Zone sectors
  const ZONE_CFG: Record<string, { base: number; spread: number; r: number }> = {
    forensic:      { base: Math.PI,       spread: 1.2, r: 430 },
    timeline:      { base: -Math.PI / 2,  spread: 1.6, r: 375 },
    environmental: { base:  Math.PI / 2,  spread: 1.6, r: 370 },
  };

  for (const [zone, cfg] of Object.entries(ZONE_CFG)) {
    const zn = nodes.filter(n => n.zone === zone);
    zn.forEach((n, i) => {
      const t = Math.max(zn.length - 1, 1);
      const angle = cfg.base - cfg.spread / 2 + (cfg.spread / t) * i;
      const r = cfg.r + (i % 2) * 85;
      pos.set(n.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    });
  }

  // Force repulsion to prevent overlaps
  const pinned = new Set([victim.id]);
  for (let iter = 0; iter < 90; iter++) {
    const alpha = 0.55 * Math.pow(0.935, iter);
    const forces = new Map(nodes.map(n => [n.id, { x: 0, y: 0 }]));
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ai = nodes[i].id, aj = nodes[j].id;
        const pi = pos.get(ai), pj = pos.get(aj);
        if (!pi || !pj) continue;
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minD = 215;
        if (dist < minD) {
          const f = (minD - dist) * 0.55;
          forces.get(ai)!.x -= (dx / dist) * f;
          forces.get(ai)!.y -= (dy / dist) * f;
          forces.get(aj)!.x += (dx / dist) * f;
          forces.get(aj)!.y += (dy / dist) * f;
        }
      }
    }
    for (const n of nodes) {
      if (pinned.has(n.id)) continue;
      const p = pos.get(n.id), f = forces.get(n.id);
      if (!p || !f) continue;
      pos.set(n.id, { x: p.x + f.x * alpha, y: p.y + f.y * alpha });
    }
  }
  return pos;
}

// ── Edge Style Map ────────────────────────────────────────────────────────────
const EDGE_STYLE: Record<RelationType, {
  stroke: string; dashArray?: string; animated: boolean;
  glow: string; labelBg: string; labelText: string; particle: string;
}> = {
  dna:           { stroke: "#22d3ee", animated: true,  glow: "drop-shadow(0 0 8px rgba(34,211,238,0.9))",  labelBg: "rgba(8,50,60,0.95)",   labelText: "#67e8f9", particle: "#22d3ee" },
  confirmed:     { stroke: "#38bdf8", animated: true,  glow: "drop-shadow(0 0 6px rgba(56,189,248,0.7))",  labelBg: "rgba(5,40,60,0.9)",    labelText: "#7dd3fc", particle: "#38bdf8" },
  suspicious:    { stroke: "#ef4444", dashArray: "8 5", animated: true,  glow: "drop-shadow(0 0 8px rgba(239,68,68,0.8))",   labelBg: "rgba(40,5,5,0.95)",    labelText: "#fca5a5", particle: "#ef4444" },
  behavioral:    { stroke: "#f97316", dashArray: "6 4", animated: true,  glow: "drop-shadow(0 0 6px rgba(249,115,22,0.7))",  labelBg: "rgba(40,15,0,0.9)",    labelText: "#fdba74", particle: "#f97316" },
  financial:     { stroke: "#eab308", dashArray: "5 4", animated: true,  glow: "drop-shadow(0 0 6px rgba(234,179,8,0.7))",   labelBg: "rgba(40,35,0,0.9)",    labelText: "#fde047", particle: "#eab308" },
  timeline:      { stroke: "#a78bfa", animated: true,  glow: "drop-shadow(0 0 7px rgba(167,139,250,0.7))", labelBg: "rgba(25,10,50,0.9)",   labelText: "#c4b5fd", particle: "#a78bfa" },
  environmental: { stroke: "#34d399", dashArray: "4 6", animated: false, glow: "drop-shadow(0 0 5px rgba(52,211,153,0.5))",  labelBg: "rgba(5,35,20,0.9)",    labelText: "#6ee7b7", particle: "#34d399" },
  weak:          { stroke: "#475569", dashArray: "3 6", animated: false, glow: "",                                           labelBg: "rgba(15,20,30,0.85)",  labelText: "#94a3b8", particle: "#64748b" },
};

// ── Custom Forensic Edge ──────────────────────────────────────────────────────
function ForensicEdgeComp({
  id, sourceX, sourceY, targetX, targetY, data,
  sourcePosition, targetPosition, selected,
}: EdgeProps) {
  const rt: RelationType = data?.relationType ?? "confirmed";
  const style = EDGE_STYLE[rt];
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const isActive = data?.highlighted || selected;
  const strokeOpacity = data?.dimmed ? 0.06 : isActive ? 1 : 0.6;
  const strokeWidth = isActive ? 2.4 : 1.5;

  return (
    <>
      {style.glow && !data?.dimmed && (
        <path d={edgePath} fill="none" stroke={style.stroke}
          strokeWidth={strokeWidth + 5} strokeOpacity={isActive ? 0.28 : 0.1}
          strokeDasharray={style.dashArray} style={{ filter: style.glow }} />
      )}
      <path id={id} d={edgePath} fill="none" stroke={style.stroke}
        strokeWidth={strokeWidth} strokeOpacity={strokeOpacity}
        strokeDasharray={style.dashArray}
        className={style.animated && !data?.dimmed ? "forensic-edge-animated" : ""}
        style={{ transition: "stroke-opacity 0.3s, stroke-width 0.2s" }} />
      {style.animated && !data?.dimmed && (
        <circle r="3.5" fill={style.particle} opacity={0.9} className="forensic-particle">
          <animateMotion dur={rt === "suspicious" ? "1.4s" : rt === "dna" ? "1.8s" : "2.2s"} repeatCount="indefinite">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}
      {!data?.dimmed && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan forensic-edge-label" style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all", cursor: "pointer",
          }} onClick={data?.onEdgeClick}>
            <div className="flex items-center gap-1 rounded-full px-2 py-0.5 border text-[9px] font-semibold tracking-wide whitespace-nowrap select-none"
              style={{
                background: style.labelBg, color: style.labelText,
                borderColor: style.stroke + "55",
                boxShadow: isActive ? `0 0 12px ${style.stroke}44` : "none",
                opacity: strokeOpacity > 0.2 ? 1 : 0,
                transition: "opacity 0.3s, box-shadow 0.2s",
              }}>
              {data?.label}
              <span className="ml-1 opacity-70">{data?.confidence}%</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { evidence: EvidenceNode };
const edgeTypes = { forensic: ForensicEdgeComp };

// ── AI Insight Panel ──────────────────────────────────────────────────────────
function AIInsightPanel({
  node, onClose, onCreateRelation,
}: { node: LiveNode; onClose: () => void; onCreateRelation: (id: string) => void }) {
  const isSuspect = node.zone === "suspect";
  const isVictim = node.zone === "victim";
  return (
    <motion.div
      initial={{ opacity: 0, x: -32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-4 left-4 z-50 w-72 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl"
    >
      <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${
        isVictim ? "bg-cyan-900/40" : isSuspect ? "bg-red-900/40" : "bg-slate-800/60"}`}>
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">AI Insight</span>
          {node.aiGenerated && (
            <span className="rounded bg-violet-600/40 px-1 py-0.5 text-[8px] font-bold text-violet-300 uppercase">AI</span>
          )}
        </div>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-white/10 transition-colors">
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-2 border-b border-white/8">
        <div className="text-sm font-bold text-white">{node.label}</div>
        {node.sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{node.sublabel}</div>}
        {node.riskLevel && (
          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
            node.riskLevel === "critical" ? "bg-red-600/80 text-white" :
            node.riskLevel === "high" ? "bg-orange-500/70 text-white" :
            "bg-yellow-500/60 text-black"}`}>{node.riskLevel} RISK</span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="flex gap-2">
          <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-200">{node.aiInsight ?? "No insight available."}</p>
        </div>
      </div>
      {node.confidence != null && (
        <div className="border-t border-white/8 px-3 py-2 flex items-center gap-3">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <span className="text-[9px] text-slate-400 uppercase tracking-wider">Confidence</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${node.confidence}%` }} />
          </div>
          <span className="text-[10px] text-emerald-300 font-mono">{node.confidence}%</span>
        </div>
      )}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => onCreateRelation(node.id)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-900/30 px-3 py-1.5 text-[10px] font-semibold text-violet-300 hover:bg-violet-800/40 transition-colors"
        >
          <Link2 className="h-3 w-3" /> Create Relation
        </button>
      </div>
    </motion.div>
  );
}

// ── Evidence Explanation Panel ────────────────────────────────────────────────
function EvidencePanel({ edge, onClose }: { edge: LiveEdge; onClose: () => void }) {
  const rt = edge.relationType;
  const style = EDGE_STYLE[rt];
  return (
    <motion.div
      initial={{ opacity: 0, x: 32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-4 right-4 z-50 w-72 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl"
    >
      <div className="flex items-center justify-between rounded-t-xl px-3 py-2 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: style.stroke, boxShadow: `0 0 6px ${style.stroke}` }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: style.labelText }}>{edge.label}</span>
        </div>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-white/10 transition-colors">
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <InfoRow icon={<ShieldCheck className="h-3 w-3 text-emerald-400" />} label="Confidence" value={`${edge.confidence}%`} />
        {edge.timestamp && <InfoRow icon={<Clock className="h-3 w-3 text-violet-400" />} label="Timestamp" value={edge.timestamp} />}
        {edge.source_ref && <InfoRow icon={<AlertTriangle className="h-3 w-3 text-yellow-400" />} label="Source" value={edge.source_ref} />}
        <div className="border-t border-white/8 pt-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Forensic Reasoning</div>
          <p className="text-[11px] leading-relaxed text-slate-200">{edge.reasoning ?? "—"}</p>
        </div>
        <div className="mt-1">
          <span className="rounded px-2 py-0.5 text-[9px] font-semibold uppercase"
            style={{ background: style.labelBg, color: style.labelText, border: `1px solid ${style.stroke}44` }}>
            {rt}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-[9px] uppercase text-slate-500 w-16 shrink-0 mt-0.5">{label}</span>
      <span className="text-[11px] text-slate-200 font-medium">{value}</span>
    </div>
  );
}

// ── Add Node Modal ────────────────────────────────────────────────────────────
const CATEGORY_ZONE: Record<string, NodeZone> = {
  evidence: "forensic",
  suspect: "suspect",
  witness: "environmental",
  location: "environmental",
};

const CATEGORY_TYPES: Record<string, { value: string; label: string }[]> = {
  evidence: [
    { value: "dna", label: "DNA / Biometric" },
    { value: "cctv", label: "CCTV Footage" },
    { value: "phone", label: "Phone Records" },
    { value: "weapon", label: "Weapon / Object" },
    { value: "fingerprint", label: "Fingerprints" },
    { value: "autopsy", label: "Autopsy Report" },
    { value: "toxicology", label: "Toxicology" },
    { value: "txn", label: "Financial Record" },
    { value: "timeline", label: "Timeline Marker" },
  ],
  suspect: [{ value: "suspect", label: "Suspect" }],
  witness: [
    { value: "witness", label: "Witness" },
    { value: "family", label: "Family Member" },
  ],
  location: [
    { value: "weather", label: "Weather / Environment" },
    { value: "location", label: "Location" },
  ],
};

const RELATION_OPTIONS: { value: RelationType; label: string }[] = [
  { value: "dna", label: "DNA / Biometric Match" },
  { value: "confirmed", label: "Confirmed Link" },
  { value: "suspicious", label: "Suspicious Connection" },
  { value: "behavioral", label: "Behavioral Pattern" },
  { value: "financial", label: "Financial Link" },
  { value: "timeline", label: "Timeline Correlation" },
  { value: "environmental", label: "Environmental Context" },
  { value: "weak", label: "Weak Evidence" },
];

function AddNodeModal({
  nodes, defaultCategory, onAdd, onClose,
}: {
  nodes: LiveNode[];
  defaultCategory: "evidence" | "suspect" | "witness" | "location";
  onAdd: (form: AddNodeForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AddNodeForm>({
    category: defaultCategory,
    type: CATEGORY_TYPES[defaultCategory][0].value,
    label: "",
    sublabel: "",
    confidence: 75,
    riskLevel: "medium",
    targetNodeId: nodes[0]?.id ?? "",
    relationType: "confirmed",
    edgeLabel: "",
    aiInsight: "",
    timestamp: "",
  });

  const set = (k: keyof AddNodeForm, v: AddNodeForm[keyof AddNodeForm]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleCategoryChange = (cat: AddNodeForm["category"]) => {
    setForm(prev => ({
      ...prev,
      category: cat,
      type: CATEGORY_TYPES[cat][0].value,
    }));
  };

  const canSubmit = form.label.trim().length > 0 && form.targetNodeId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(4,8,20,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col w-[90vw] max-w-[420px] max-h-full rounded-2xl border border-white/10 bg-slate-950/98 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Add Investigation Node</span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Node Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["evidence", "suspect", "witness", "location"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-lg py-2 text-[10px] font-semibold uppercase transition-all ${
                    form.category === cat
                      ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                      : "border border-white/10 bg-slate-900/60 text-slate-400 hover:bg-slate-800/60"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subtype */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Evidence Type</label>
            <select
              value={form.type}
              onChange={e => set("type", e.target.value)}
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500/50"
            >
              {CATEGORY_TYPES[form.category].map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Title *</label>
            <input
              value={form.label}
              onChange={e => set("label", e.target.value)}
              placeholder="e.g. DNA Sample D-88"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Sublabel */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Subtitle / Meta</label>
            <input
              value={form.sublabel}
              onChange={e => set("sublabel", e.target.value)}
              placeholder="e.g. Match 98.5% – S-118"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Confidence */}
          <div>
            <label className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <span>Confidence</span><span className="text-cyan-400 font-mono">{form.confidence}%</span>
            </label>
            <input type="range" min={0} max={100} value={form.confidence}
              onChange={e => set("confidence", parseInt(e.target.value))}
              className="w-full accent-cyan-500" />
          </div>

          {/* Connect to */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Connect to Node *</label>
            <select
              value={form.targetNodeId}
              onChange={e => set("targetNodeId", e.target.value)}
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500/50"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.label} ({n.zone})</option>
              ))}
            </select>
          </div>

          {/* Relation type */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Relation Type</label>
            <select
              value={form.relationType}
              onChange={e => set("relationType", e.target.value as RelationType)}
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500/50"
            >
              {RELATION_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Edge label */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Connection Label</label>
            <input
              value={form.edgeLabel}
              onChange={e => set("edgeLabel", e.target.value)}
              placeholder="e.g. DNA Match, Phone Overlap…"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Timestamp */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Timestamp</label>
            <input
              value={form.timestamp}
              onChange={e => set("timestamp", e.target.value)}
              placeholder="e.g. 22 Apr 21:15"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* AI Insight */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Forensic Notes / AI Insight</label>
            <textarea
              value={form.aiInsight}
              onChange={e => set("aiInsight", e.target.value)}
              rows={3}
              placeholder="Describe the evidence and its relevance…"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            disabled={!canSubmit}
            onClick={() => canSubmit && onAdd(form)}
            className="w-full rounded-xl py-2.5 text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(139,92,246,0.3))"
                : undefined,
              border: "1px solid rgba(6,182,212,0.4)",
              color: canSubmit ? "#67e8f9" : "#475569",
            }}
          >
            Add to Canvas
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Create Relation Modal ─────────────────────────────────────────────────────
function RelationConfigModal({
  sourceNode, targetNode, onConfirm, onCancel,
}: {
  sourceNode: LiveNode;
  targetNode: LiveNode;
  onConfirm: (rt: RelationType, confidence: number, label: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [rt, setRt] = useState<RelationType>("confirmed");
  const [conf, setConf] = useState(70);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const style = EDGE_STYLE[rt];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(4,8,20,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="flex flex-col w-[90vw] max-w-[380px] max-h-full rounded-2xl border border-white/10 bg-slate-950/98 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-bold text-white">Create Relation</span>
          </div>
          <button onClick={onCancel} className="rounded p-1 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Source → Target */}
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-900/50 p-3">
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">From</div>
              <div className="text-[11px] font-bold text-white truncate">{sourceNode.label}</div>
            </div>
            <div className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: style.stroke + "80" }} />
            <div className="h-2 w-2 rounded-full" style={{ background: style.stroke }} />
            <div className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: style.stroke + "80" }} />
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">To</div>
              <div className="text-[11px] font-bold text-white truncate">{targetNode.label}</div>
            </div>
          </div>

          {/* Relation type */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Relation Type</label>
            <select value={rt} onChange={e => setRt(e.target.value as RelationType)}
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500/50">
              {RELATION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <span>Confidence</span><span className="text-cyan-400 font-mono">{conf}%</span>
            </label>
            <input type="range" min={0} max={100} value={conf}
              onChange={e => setConf(parseInt(e.target.value))}
              className="w-full accent-cyan-500" />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Phone Overlap, Witness Account…"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Optional forensic reasoning…"
              className="w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none" />
          </div>

          <button
            onClick={() => onConfirm(rt, conf, label || rt, notes)}
            className="w-full rounded-xl py-2.5 text-[12px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.25))",
              border: "1px solid rgba(139,92,246,0.45)",
              color: "#c4b5fd",
            }}
          >
            Draw Connection
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function NodeContextMenu({
  x, y, nodeId, nodes, onClose, onCreateRelation, onAddEvidence, onRemove,
}: {
  x: number; y: number; nodeId: string;
  nodes: LiveNode[];
  onClose: () => void;
  onCreateRelation: (id: string) => void;
  onAddEvidence: () => void;
  onRemove: (id: string) => void;
}) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const items = [
    { icon: <Link2 className="h-3 w-3" />, label: "Create Relation", action: () => { onCreateRelation(nodeId); onClose(); }, color: "text-violet-300" },
    { icon: <Plus className="h-3 w-3" />, label: "Add Evidence Here", action: () => { onAddEvidence(); onClose(); }, color: "text-cyan-300" },
    { icon: <GitBranch className="h-3 w-3" />, label: "Expand Related", action: onClose, color: "text-sky-300" },
    { icon: <Clock className="h-3 w-3" />, label: "Show Timeline", action: onClose, color: "text-violet-300" },
    { icon: <Siren className="h-3 w-3" />, label: "Mark Suspicious", action: onClose, color: "text-orange-300" },
    { icon: <Trash2 className="h-3 w-3" />, label: "Remove Node", action: () => { onRemove(nodeId); onClose(); }, color: "text-red-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[200] w-48 rounded-xl border border-white/10 bg-slate-950/98 py-1.5 shadow-2xl backdrop-blur-xl"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      <div className="px-3 py-1.5 border-b border-white/8 mb-1">
        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold truncate">{node.label}</div>
      </div>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.action}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium hover:bg-white/6 transition-colors ${item.color}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── Floating Action Bar ───────────────────────────────────────────────────────
function FloatingActionBar({
  relationFlow,
  onAddCategory,
  onStartRelation,
  onCancelFlow,
}: {
  relationFlow: RelationFlowState;
  onAddCategory: (cat: "evidence" | "suspect" | "witness" | "location") => void;
  onStartRelation: () => void;
  onCancelFlow: () => void;
}) {
  const inFlow = relationFlow !== null && (relationFlow.step === "pick-source" || relationFlow.step === "pick-target");

  const FABS = [
    { icon: <FileText className="h-3.5 w-3.5" />, label: "Evidence", color: "border-sky-500/40 text-sky-300 hover:bg-sky-900/30", action: () => onAddCategory("evidence") },
    { icon: <UserX className="h-3.5 w-3.5" />, label: "Suspect", color: "border-red-500/40 text-red-300 hover:bg-red-900/30", action: () => onAddCategory("suspect") },
    { icon: <Eye className="h-3.5 w-3.5" />, label: "Witness", color: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/30", action: () => onAddCategory("witness") },
    { icon: <MapPin className="h-3.5 w-3.5" />, label: "Location", color: "border-blue-500/40 text-blue-300 hover:bg-blue-900/30", action: () => onAddCategory("location") },
    { icon: <Link2 className="h-3.5 w-3.5" />, label: "Relation", color: "border-violet-500/40 text-violet-300 hover:bg-violet-900/30", action: onStartRelation },
  ];

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
      <AnimatePresence>
        {inFlow && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-slate-950/95 px-4 py-2 shadow-xl backdrop-blur-xl"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-violet-300">
              {relationFlow?.step === "pick-source"
                ? "Click source node to start relation…"
                : "Now click the target node…"}
            </span>
            <button onClick={onCancelFlow} className="ml-2 rounded p-0.5 hover:bg-white/10 transition-colors">
              <X className="h-3 w-3 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 rounded-2xl border border-white/8 bg-slate-950/90 px-3 py-2 shadow-2xl backdrop-blur-xl">
        <span className="mr-1 text-[9px] uppercase tracking-widest text-slate-600 font-semibold">Add</span>
        {FABS.map(fab => (
          <button
            key={fab.label}
            onClick={fab.action}
            title={fab.label}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${fab.color}`}
          >
            {fab.icon}
            <span className="hidden sm:inline">{fab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mini Legend ───────────────────────────────────────────────────────────────
const LEGEND_ITEMS: { label: string; rt: RelationType }[] = [
  { label: "DNA / Biometric", rt: "dna" },
  { label: "Confirmed", rt: "confirmed" },
  { label: "Suspicious", rt: "suspicious" },
  { label: "Behavioral", rt: "behavioral" },
  { label: "Financial", rt: "financial" },
  { label: "Timeline", rt: "timeline" },
  { label: "Environmental", rt: "environmental" },
  { label: "Weak Evidence", rt: "weak" },
];

const ZONE_LEGEND = [
  { label: "Victim", color: "#22d3ee" },
  { label: "Suspect", color: "#ef4444" },
  { label: "Forensic", color: "#38bdf8" },
  { label: "Timeline", color: "#a78bfa" },
  { label: "Environment", color: "#34d399" },
];

function MiniLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute top-3 right-3 z-40 pointer-events-auto">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/80 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 backdrop-blur hover:bg-slate-900/90 transition-colors"
      >
        <div className="h-2 w-2 rounded-full bg-cyan-400" />
        LEGEND
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="mt-1.5 w-48 rounded-xl border border-white/10 bg-slate-950/97 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-2 text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Edge Relations</div>
            <div className="space-y-1.5">
              {LEGEND_ITEMS.map(({ label, rt }) => {
                const s = EDGE_STYLE[rt];
                return (
                  <div key={rt} className="flex items-center gap-2">
                    <div className="flex h-2 w-8 items-center">
                      <div className="h-px flex-1" style={{
                        background: s.stroke, opacity: 0.85,
                        backgroundImage: s.dashArray
                          ? `repeating-linear-gradient(to right, ${s.stroke} 0, ${s.stroke} 4px, transparent 4px, transparent 8px)`
                          : undefined,
                      }} />
                    </div>
                    <span className="text-[9px] text-slate-300">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 border-t border-white/8 pt-2">
              <div className="mb-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Node Zones</div>
              {ZONE_LEGEND.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <span className="text-[9px] text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function InvestigationGraph({ onSelect }: { onSelect?: (id: string | null) => void }) {
  // Live state (start from case data, grow dynamically)
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>(() => caseGraph.nodes as LiveNode[]);
  const [liveEdges, setLiveEdges] = useState<LiveEdge[]>(() => caseGraph.edges as LiveEdge[]);

  // Positions: computed once from layout, then updated by drags and node additions
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(() =>
    computeLayout(caseGraph.nodes as LiveNode[], caseGraph.edges as LiveEdge[])
  );

  // Selection / hover
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // UI state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [addModal, setAddModal] = useState<{ category: "evidence" | "suspect" | "witness" | "location" } | null>(null);
  const [relationFlow, setRelationFlow] = useState<RelationFlowState>(null);

  const selectedNode = useMemo(() => liveNodes.find(n => n.id === selectedNodeId) ?? null, [liveNodes, selectedNodeId]);
  const selectedEdge = useMemo(() => liveEdges.find(e => e.id === selectedEdgeId) ?? null, [liveEdges, selectedEdgeId]);

  // Adjacency
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of liveEdges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [liveEdges]);

  const connectedEdgeIds = useMemo<Set<string>>(() => {
    if (!hoveredNodeId) return new Set();
    const s = new Set<string>();
    for (const e of liveEdges) {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) s.add(e.id);
    }
    return s;
  }, [hoveredNodeId, liveEdges]);

  const connectedNodeIds = useMemo<Set<string>>(() => {
    if (!hoveredNodeId) return new Set();
    const nb = adjacencyMap.get(hoveredNodeId) ?? new Set();
    return new Set([hoveredNodeId, ...nb]);
  }, [hoveredNodeId, adjacencyMap]);

  // Relation counts per node
  const relationCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of liveEdges) {
      m.set(e.source, (m.get(e.source) ?? 0) + 1);
      m.set(e.target, (m.get(e.target) ?? 0) + 1);
    }
    return m;
  }, [liveEdges]);

  // Build ReactFlow nodes
  const rfNodes: Node[] = useMemo(() => liveNodes.map(n => {
    const isDimmed = hoveredNodeId !== null && !connectedNodeIds.has(n.id);
    const pos = nodePositions.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      type: "evidence",
      position: pos,
      data: {
        ...n,
        dimmed: isDimmed,
        relationCount: relationCount.get(n.id) ?? 0,
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, nodeId: n.id });
        },
      },
      selected: n.id === selectedNodeId,
      style: {
        opacity: isDimmed ? 0.15 : 1,
        transition: "opacity 0.3s",
      },
    };
  }), [liveNodes, nodePositions, hoveredNodeId, connectedNodeIds, selectedNodeId, relationCount]);

  // Build ReactFlow edges
  const rfEdges: Edge[] = useMemo(() => liveEdges.map(e => {
    const isDimmed = hoveredNodeId !== null && !connectedEdgeIds.has(e.id);
    const isHighlighted = hoveredNodeId !== null && connectedEdgeIds.has(e.id);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "forensic",
      data: {
        ...e,
        dimmed: isDimmed,
        highlighted: isHighlighted,
        onEdgeClick: () => { setSelectedEdgeId(e.id); setSelectedNodeId(null); },
      },
      selected: e.id === selectedEdgeId,
    };
  }), [liveEdges, hoveredNodeId, connectedEdgeIds, selectedEdgeId]);

  // Handlers
  const onNodeClick = useCallback((_: React.MouseEvent, rfNode: Node) => {
    setContextMenu(null);

    if (relationFlow?.step === "pick-source") {
      setRelationFlow({ step: "pick-target", sourceId: rfNode.id });
      return;
    }
    if (relationFlow?.step === "pick-target") {
      if (rfNode.id !== relationFlow.sourceId) {
        setRelationFlow({ step: "configure", sourceId: relationFlow.sourceId, targetId: rfNode.id });
      }
      return;
    }

    setSelectedNodeId(rfNode.id);
    setSelectedEdgeId(null);
    onSelect?.(rfNode.id);
  }, [relationFlow, onSelect]);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    if (relationFlow && relationFlow.step !== "configure") return;
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    onSelect?.(null);
  }, [onSelect, relationFlow]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, n: Node) => setHoveredNodeId(n.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  const onNodeDragStop = useCallback((_: React.MouseEvent, n: Node) => {
    setNodePositions(prev => new Map(prev).set(n.id, { x: n.position.x, y: n.position.y }));
  }, []);

  // Add node
  const handleAddNode = useCallback((form: AddNodeForm) => {
    const newId = `node-${Date.now()}`;
    const targetPos = nodePositions.get(form.targetNodeId) ?? { x: 0, y: 0 };
    const angle = Math.random() * Math.PI * 2;
    const spawnPos = {
      x: targetPos.x + Math.cos(angle) * 220,
      y: targetPos.y + Math.sin(angle) * 180,
    };

    const newNode: LiveNode = {
      id: newId,
      zone: CATEGORY_ZONE[form.category],
      type: form.type,
      label: form.label,
      sublabel: form.sublabel || undefined,
      confidence: form.confidence,
      riskLevel: form.category === "suspect" ? form.riskLevel as "critical" | "high" | "medium" | "low" : undefined,
      aiInsight: form.aiInsight || undefined,
      aiGenerated: false,
      x: spawnPos.x, y: spawnPos.y,
    };

    const newEdge: LiveEdge = {
      id: `edge-${Date.now()}`,
      source: form.targetNodeId,
      target: newId,
      label: form.edgeLabel || form.relationType,
      relationType: form.relationType,
      confidence: form.confidence,
      timestamp: form.timestamp || undefined,
      reasoning: form.aiInsight || undefined,
    };

    setLiveNodes(prev => [...prev, newNode]);
    setLiveEdges(prev => [...prev, newEdge]);
    setNodePositions(prev => new Map(prev).set(newId, spawnPos));
    setAddModal(null);
    setSelectedNodeId(newId);
  }, [nodePositions]);

  // Add relation
  const handleConfirmRelation = useCallback((rt: RelationType, conf: number, label: string, notes: string) => {
    if (relationFlow?.step !== "configure") return;
    const newEdge: LiveEdge = {
      id: `edge-${Date.now()}`,
      source: relationFlow.sourceId,
      target: relationFlow.targetId,
      label,
      relationType: rt,
      confidence: conf,
      reasoning: notes || undefined,
    };
    setLiveEdges(prev => [...prev, newEdge]);
    setRelationFlow(null);
  }, [relationFlow]);

  const startRelationFrom = useCallback((nodeId: string) => {
    setSelectedNodeId(null);
    setRelationFlow({ step: "pick-target", sourceId: nodeId });
  }, []);

  const startRelationFlow = useCallback(() => {
    if (selectedNodeId) {
      setRelationFlow({ step: "pick-target", sourceId: selectedNodeId });
      setSelectedNodeId(null);
    } else {
      setRelationFlow({ step: "pick-source" });
    }
  }, [selectedNodeId]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setLiveNodes(prev => prev.filter(n => n.id !== nodeId));
    setLiveEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    setNodePositions(prev => { const m = new Map(prev); m.delete(nodeId); return m; });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const relSourceNode = useMemo(() =>
    relationFlow?.step === "configure" ? liveNodes.find(n => n.id === (relationFlow as {sourceId:string}).sourceId) ?? null : null,
    [relationFlow, liveNodes]
  );
  const relTargetNode = useMemo(() =>
    relationFlow?.step === "configure" ? liveNodes.find(n => n.id === (relationFlow as {targetId:string}).targetId) ?? null : null,
    [relationFlow, liveNodes]
  );

  return (
    <div className="relative h-full w-full" onClick={() => contextMenu && setContextMenu(null)}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.25}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStop={onNodeDragStop}
        defaultEdgeOptions={{ type: "forensic" }}
        nodesDraggable
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="rgba(100,180,255,0.10)" />
        <MiniMap
          maskColor="rgba(6,10,20,0.78)"
          nodeColor={n => {
            const z = n.data?.zone;
            if (z === "victim")        return "#22d3ee";
            if (z === "suspect")       return "#ef4444";
            if (z === "forensic")      return "#38bdf8";
            if (z === "timeline")      return "#a78bfa";
            if (z === "environmental") return "#34d399";
            return "#94a3b8";
          }}
          style={{ background: "rgba(8,12,24,0.88)", border: "1px solid rgba(100,180,255,0.15)", borderRadius: 10 }}
          pannable zoomable
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>

      {/* Header badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-40">
        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-950/80 px-3 py-1.5 backdrop-blur">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Living Evidence Canvas</span>
          <span className="text-[10px] text-slate-500">· Case C-2041</span>
          <span className="ml-1 text-[10px] text-slate-600">
            {liveNodes.length} nodes · {liveEdges.length} relations
          </span>
        </div>
      </div>

      <MiniLegend />

      {/* Floating Action Bar */}
      <FloatingActionBar
        relationFlow={relationFlow}
        onAddCategory={cat => setAddModal({ category: cat })}
        onStartRelation={startRelationFlow}
        onCancelFlow={() => setRelationFlow(null)}
      />

      {/* Overlays (pointer-events: none wrapper so ReactFlow gets events) */}
      <div className="pointer-events-none absolute inset-0 z-50">
        <AnimatePresence>
          {selectedNode && !addModal && relationFlow?.step !== "configure" && (
            <AIInsightPanel
              node={selectedNode}
              onClose={() => { setSelectedNodeId(null); onSelect?.(null); }}
              onCreateRelation={startRelationFrom}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedEdge && !selectedNode && (
            <EvidencePanel edge={selectedEdge} onClose={() => setSelectedEdgeId(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            nodes={liveNodes}
            onClose={() => setContextMenu(null)}
            onCreateRelation={startRelationFrom}
            onAddEvidence={() => setAddModal({ category: "evidence" })}
            onRemove={handleRemoveNode}
          />
        )}
      </AnimatePresence>

      {/* Add Node Modal */}
      <AnimatePresence>
        {addModal && (
          <AddNodeModal
            nodes={liveNodes}
            defaultCategory={addModal.category}
            onAdd={handleAddNode}
            onClose={() => setAddModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Relation Config Modal */}
      <AnimatePresence>
        {relationFlow?.step === "configure" && relSourceNode && relTargetNode && (
          <RelationConfigModal
            sourceNode={relSourceNode}
            targetNode={relTargetNode}
            onConfirm={handleConfirmRelation}
            onCancel={() => setRelationFlow(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
