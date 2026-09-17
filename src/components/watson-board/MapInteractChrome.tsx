import { useEffect, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

type MapInteractChromeProps = {
  shellRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<LeafletMap | null>;
  onFullscreenChange?: (open: boolean) => void;
  className?: string;
};

export function MapInteractChrome({
  shellRef,
  mapRef,
  onFullscreenChange,
  className,
}: MapInteractChromeProps) {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const el = shellRef.current;
    const sync = () => {
      const open = el !== null && document.fullscreenElement === el;
      setIsFs(open);
      onFullscreenChange?.(open);
      requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: true }));
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [shellRef, mapRef, onFullscreenChange]);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* browsers may block without gesture */
    }
  };

  return (
    <div
      className={[
        "absolute right-3 top-3 z-[1100] flex flex-col gap-1.5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col overflow-hidden rounded-lg border border-primary/35 bg-background/95 shadow-md backdrop-blur-sm">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn(1)}
          className="grid h-9 w-9 place-items-center text-primary transition-colors hover:bg-primary/10"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut(1)}
          className="grid h-9 w-9 place-items-center border-t border-border/60 text-primary transition-colors hover:bg-primary/10"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="grid h-9 w-9 place-items-center rounded-lg border border-primary/35 bg-background/95 text-primary shadow-md backdrop-blur-sm transition-colors hover:bg-primary/10"
        aria-label={isFs ? "Exit full screen" : "View map full screen"}
      >
        {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
