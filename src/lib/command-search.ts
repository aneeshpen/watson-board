import {
  autopsy,
  caseGraph,
  cases,
  districts,
  heatmapZones,
} from "@/data/data";

export type CommandSearchHit = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  to: string;
};

const MAX = 14;

function norm(s: string) {
  return s.trim().toLowerCase();
}

function hay(...parts: (string | number | undefined | null)[]) {
  return parts
    .filter((p) => p !== undefined && p !== null && String(p).length > 0)
    .map((p) => String(p))
    .join(" ")
    .toLowerCase();
}

export function searchCommandBar(raw: string): CommandSearchHit[] {
  const q = norm(raw);
  if (q.length < 1) return [];

  const hits: CommandSearchHit[] = [];
  const seen = new Set<string>();

  const push = (h: CommandSearchHit) => {
    const key = `${h.kind}:${h.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(h);
  };

  const matches = (blob: string) => blob.includes(q);

  for (const c of cases) {
    if (matches(hay(c.id, c.fir, c.title, c.district, c.officer, c.type, c.status))) {
      push({
        id: `case-${c.id}`,
        kind: "Case",
        title: `${c.id} · ${c.title}`,
        subtitle: `${c.fir} · ${c.district}`,
        to: `/cases/${c.id}`,
      });
    }
  }



  for (const n of caseGraph.nodes) {
    if (
      matches(
        hay(n.id, n.label, n.sublabel, n.meta, n.type, n.zone, n.aiInsight, n.autopsyStatus, n.causeOfDeath),
      )
    ) {
      push({
        id: `node-${n.id}`,
        kind: "C-2041 graph",
        title: n.label,
        subtitle: n.sublabel ?? n.type,
        to: "/cases/C-2041",
      });
    }
  }

  if (
    matches(
      hay(autopsy.caseId, autopsy.subject, autopsy.causeOfDeath, autopsy.todRange, "autopsy", "A-2041"),
    )
  ) {
    push({
      id: "autopsy-record",
      kind: "Forensic",
      title: `Autopsy · ${autopsy.caseId}`,
      subtitle: autopsy.subject,
      to: "/cases/C-2041",
    });
  }

  for (const z of heatmapZones) {
    if (matches(hay(z.district))) {
      push({
        id: `dist-${z.district}`,
        kind: "District",
        title: z.district,
        subtitle: `${z.crimes} incidents · risk index ${z.risk}`,
        to: "/heatmap",
      });
    }
  }

  for (const d of districts) {
    if (matches(hay(d)) && !seen.has(`District:dist-${d}`)) {
      push({
        id: `dist-${d}`,
        kind: "District",
        title: d,
        subtitle: "TN jurisdiction",
        to: "/heatmap",
      });
    }
  }

  if (q.length >= 2) {
    const nav: { keys: string[]; title: string; subtitle: string; to: string }[] = [
      { keys: ["copilot", "assistant"], title: "AI Copilot", subtitle: "Briefing session", to: "/copilot" },
      { keys: ["timeline", "replay"], title: "Timeline Replay", subtitle: "Event reconstruction", to: "/timeline" },
      { keys: ["report"], title: "Reports", subtitle: "Intelligence dashboard", to: "/reports" },
      { keys: ["alert"], title: "Alerts", subtitle: "Signal queue", to: "/alerts" },
      { keys: ["setting"], title: "Settings", subtitle: "Workspace", to: "/settings" },
      { keys: ["heatmap", "heat map"], title: "Risk heatmaps", subtitle: "District risk", to: "/heatmap" },
      { keys: ["cases"], title: "All cases", subtitle: "Registry", to: "/cases" },
      { keys: ["graph", "investigation"], title: "Investigation graph", subtitle: "C-2041 network view", to: "/cases/C-2041" },
    ];
    for (const n of nav) {
      if (n.keys.some((k) => q.includes(k))) {
        push({ id: `nav-${n.to}`, kind: "Page", title: n.title, subtitle: n.subtitle, to: n.to });
      }
    }
  }

  return hits.slice(0, MAX);
}
