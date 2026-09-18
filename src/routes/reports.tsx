import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { StatCard } from "@/components/watson-board/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cases, districts } from "@/data/data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, FileBarChart, MapPin, ShieldAlert } from "lucide-react";

const trend = Array.from({ length: 14 }, (_, i) => ({
  d: `D${i + 1}`,
  cases: 80 + Math.round(Math.sin(i / 2) * 20 + i * 2),
  flagged: 10 + Math.round(Math.cos(i / 3) * 5 + i),
}));

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Watson-Board" },
      { name: "description", content: "Forensic intelligence reports." },
    ],
  }),
  component: () => {
    const totalCases = cases.length;
    const flaggedCases = cases.filter((c) => c.flagged);
    const criticalCases = cases.filter((c) => c.severity === "critical");
    const avgAi = Math.round(
      cases.reduce((acc, c) => acc + c.aiConfidence, 0) / Math.max(1, cases.length),
    );

    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const casesDelta = prev ? last.cases - prev.cases : 0;
    const flaggedDelta = prev ? last.flagged - prev.flagged : 0;

    const districtData = districts
      .map((d) => {
        const inDistrict = cases.filter((c) => c.district === d);
        const flagged = inDistrict.filter((c) => c.flagged).length;
        return { district: d, flagged, total: inDistrict.length };
      })
      .sort((a, b) => b.flagged - a.flagged || b.total - a.total);

    const topFlagged = [...flaggedCases]
      .sort((a, b) => (b.severity === a.severity ? b.aiConfidence - a.aiConfidence : 0))
      .slice(0, 5);

    return (
      <Shell>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-gradient">Intelligence Reports</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Operational snapshot across cases, flags, and district-level anomalies (last 14
                days).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  downloadJson("watson-board-report.json", {
                    generatedAt: new Date().toISOString(),
                    trend,
                    districtData,
                    cases,
                  })
                }
              >
                <Download />
                Export JSON
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Total cases"
              value={totalCases}
              icon={MapPin}
              tone="primary"
              trend={`${casesDelta >= 0 ? "+" : ""}${casesDelta} vs yesterday`}
              sub={`${districtData.filter((d) => d.total > 0).length} districts active`}
            />
            <StatCard
              label="Flagged"
              value={flaggedCases.length}
              icon={ShieldAlert}
              tone="danger"
              trend={`${flaggedDelta >= 0 ? "+" : ""}${flaggedDelta} vs yesterday`}
              sub={`${Math.round((flaggedCases.length / Math.max(1, totalCases)) * 100)}% of all cases`}
            />
            <StatCard
              label="Critical severity"
              value={criticalCases.length}
              icon={AlertTriangle}
              tone="warn"
              sub="Requires supervisor review"
            />
            <StatCard
              label="Avg AI confidence"
              value={avgAi}
              icon={FileBarChart}
              tone="success"
              sub="Across active dataset"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-xl p-4 lg:col-span-2">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Cases trend (14 days)
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="text-foreground">Cases</span> vs{" "}
                    <span className="text-foreground">Flagged</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="border border-border/60 bg-secondary/40">
                    Updated just now
                  </Badge>
                </div>
              </div>
              <div className="mt-3 h-80">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,200,255,0.12)" />
                    <XAxis dataKey="d" stroke="#7e8aa1" fontSize={11} />
                    <YAxis stroke="#7e8aa1" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,20,35,0.9)",
                        border: "1px solid rgba(120,200,255,0.3)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      stroke="#5fd4ff"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="flagged"
                      stroke="#ff4d6d"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Flagged by district
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Flagged counts (current dataset)
                    </div>
                  </div>
                  <Badge variant="outline" className="border-border/60">
                    Top {Math.min(6, districtData.length)}
                  </Badge>
                </div>
                <div className="mt-3 h-52">
                  <ResponsiveContainer>
                    <BarChart
                      data={districtData.slice(0, 6)}
                      layout="vertical"
                      margin={{ left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,200,255,0.10)" />
                      <XAxis type="number" stroke="#7e8aa1" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="district"
                        stroke="#7e8aa1"
                        fontSize={11}
                        width={82}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15,20,35,0.9)",
                          border: "1px solid rgba(120,200,255,0.3)",
                        }}
                      />
                      <Bar dataKey="flagged" fill="#a48bff" radius={[6, 6, 6, 6]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Top flagged cases
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Highest risk signals to triage first
                    </div>
                  </div>
                  <Badge variant="secondary" className="border border-border/60 bg-secondary/40">
                    {flaggedCases.length} flagged
                  </Badge>
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow className="border-border/60">
                        <TableHead>Case</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead className="text-right">AI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topFlagged.map((c) => (
                        <TableRow key={c.id} className="border-border/50">
                          <TableCell className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {c.id}
                              </span>
                              <span className="truncate text-sm">{c.title}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge
                                variant={
                                  c.severity === "critical"
                                    ? "destructive"
                                    : c.severity === "high"
                                      ? "default"
                                      : "secondary"
                                }
                                className="capitalize"
                              >
                                {c.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{c.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{c.district}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {c.aiConfidence}%
                          </TableCell>
                        </TableRow>
                      ))}
                      {topFlagged.length === 0 && (
                        <TableRow className="border-border/50">
                          <TableCell
                            colSpan={3}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No flagged cases in the current dataset.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  },
});
