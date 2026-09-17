import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { heatmapZones } from "@/data/data";
import { useDistrictFilter } from "@/contexts/DistrictFilterContext";
import { MapInteractChrome } from "@/components/watson-board/MapInteractChrome";
import { cn } from "@/lib/utils";

const KA_OVERVIEW: [number, number] = [12.0, 77.5];
const KA_ZOOM = 6;

export function RiskMap() {
  const { district: districtFilter } = useDistrictFilter();
  const ref = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const zones = useMemo(
    () =>
      districtFilter ? heatmapZones.filter((z) => z.district === districtFilter) : heatmapZones,
    [districtFilter],
  );

  useEffect(() => {
    if (!ref.current) return;

    const map = L.map(ref.current, {
      center: KA_OVERVIEW,
      zoom: KA_ZOOM,
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    zones.forEach((z) => {
      const r = 8 + (z.risk / 100) * 22;
      const color = z.risk > 80 ? "#ff4d6d" : z.risk > 60 ? "#ffb454" : "#5fd4ff";
      const m = L.circleMarker([z.lat, z.lng], {
        radius: r,
        color,
        fillColor: color,
        fillOpacity: districtFilter ? 0.5 : 0.35,
        weight: districtFilter ? 3 : 2,
      }).addTo(map);
      m.bindTooltip(
        `<div style="font-size:11px"><b>${z.district}</b><br/>Crimes: ${z.crimes}<br/>Risk: ${z.risk}<br/>Officers: ${z.officers}</div>`,
        { direction: "top" },
      );
    });

    if (zones.length === 1) {
      map.setView([zones[0].lat, zones[0].lng], 9);
    } else if (zones.length > 1) {
      const bounds = L.latLngBounds(
        zones.map((z) => [z.lat, z.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: districtFilter ? 10 : 8 });
    } else {
      map.setView(KA_OVERVIEW, KA_ZOOM);
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [districtFilter, zones]);

  const labelDistrict = districtFilter ?? "Karnataka & Tamil Nadu";
  const missingData = Boolean(districtFilter && zones.length === 0);

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 bg-background",
        fullscreen ? "h-screen max-h-[100dvh] w-full rounded-none" : "h-[360px]",
      )}
    >
      <div ref={ref} className="h-full w-full min-h-[200px]" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-primary/20" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-5rem)] rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
        AI Risk Heatmap · {labelDistrict}
      </div>
      <MapInteractChrome shellRef={shellRef} mapRef={mapRef} onFullscreenChange={setFullscreen} />
      {missingData && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-16 z-[500] rounded-md border border-warn/40 bg-background/90 px-3 py-2 text-center text-[11px] text-muted-foreground backdrop-blur">
          No demo risk centroid for <span className="font-medium text-foreground">{districtFilter}</span>.
          Choose another district or clear the filter.
        </div>
      )}
    </div>
  );
}
