import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { StatCard } from "@/components/watson-board/StatCard";
import { RiskMap } from "@/components/watson-board/RiskMap";
import { LiveFeed } from "@/components/watson-board/LiveFeed";
import { CaseTable } from "@/components/watson-board/CaseTable";
import {
  FolderOpen,
  ShieldAlert,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  FileQuestion,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useStats } from "@/hooks/use-api";
import { BackendStatus } from "@/components/watson-board/BackendStatus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Watson-Board — Forensic Command Center" },
      {
        name: "description",
        content: "AI-powered forensic triage & investigation intelligence platform.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  // React Query handles caching, dedup and retries; the error state is
  // surfaced to the user instead of being swallowed.
  const { data: stats, isError, isLoading } = useStats();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadMessage(`Successfully parsed autopsy report: ${file.name}`);
      setTimeout(() => setUploadMessage(null), 5000);
      // Reset the input so the same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  return (
    <Shell>
      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wider text-white uppercase">
            Command Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {uploadMessage && (
              <span className="text-sm font-semibold text-emerald-400 animate-pulse">
                {uploadMessage}
              </span>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
              onChange={handleUpload}
            />
            {/* <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-cyan-600/20 border border-cyan-500/50 px-4 py-2 text-sm font-bold text-cyan-300 transition-colors hover:bg-cyan-500/30"
            >
              <Upload className="h-4 w-4" />
              Add Autopsy Report
            </button> */}
          </div>
        </div>

        <BackendStatus
          isError={isError}
          isLoading={isLoading}
          usingFixtures={Boolean(stats?.fixture_counters?.length)}
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard
            label="Active Cases"
            value={stats?.active_cases ?? 142}
            icon={FolderOpen}
            sub="↑ 8 today"
            trend="+5.2% vs week"
          />
          <StatCard
            label="High Risk Cases"
            value={stats?.high_risk ?? 37}
            icon={ShieldAlert}
            tone="danger"
            sub="3 critical"
            trend="2 escalated"
          />
          <StatCard
            label="Total Autopsies"
            value={stats?.total_autopsies ?? 19}
            icon={Stethoscope}
            tone="warn"
            sub="in dataset"
            trend="avg 36h"
          />
          <StatCard
            label="AI Flagged"
            value={stats?.ai_flagged ?? 26}
            icon={Sparkles}
            tone="neon-2"
            sub="auto-tagged"
            trend="confidence ↑"
          />
          <StatCard
            label="Contradictions"
            value={stats?.contradictions ?? 58}
            icon={AlertTriangle}
            tone="danger"
            sub="across cases"
            trend="3 new today"
          />
          <StatCard
            label="Missing Evidence"
            value={stats?.missing_evidence ?? 11}
            icon={FileQuestion}
            tone="warn"
            sub="DNA / CCTV"
            trend="2 requested"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RiskMap />
          </div>
          <LiveFeed />
        </div>

        <CaseTable />
      </div>
    </Shell>
  );
}
