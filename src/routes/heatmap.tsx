import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { RiskMap } from "@/components/watson-board/RiskMap";
import { heatmapZones } from "@/data/data";
import { useDistrictFilter } from "@/contexts/DistrictFilterContext";

function HeatmapPage() {
  const { district } = useDistrictFilter();
  const zones = district ? heatmapZones.filter((z) => z.district === district) : heatmapZones;

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-semibold text-gradient">Risk Heatmaps</h1>
        {district && (
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{district}</span> — change district in the header filter.
          </p>
        )}
      </div>
      <RiskMap />
      {zones.length === 0 && district ? (
        <p className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          No demo risk tiles for <span className="font-medium text-foreground">{district}</span>. Try a district from the heatmap dataset or select{" "}
          <span className="font-medium text-foreground">All districts</span>.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {zones.map((z) => (
            <div key={z.district} className="glass rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{z.district}</div>
              <div className="mt-1 font-mono text-2xl">{z.risk}</div>
              <div className="text-[11px] text-muted-foreground">
                {z.crimes} crimes · {z.officers} officers
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/heatmap")({
  head: () => ({ meta: [{ title: "Heatmaps — Watson-Board" }, { name: "description", content: "Crime risk heatmaps across Karnataka and Tamil Nadu." }] }),
  component: () => (
    <Shell>
      <HeatmapPage />
    </Shell>
  ),
});
