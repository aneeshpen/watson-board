import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { TimelineReplay } from "@/components/watson-board/TimelineReplay";
import { MovementMap } from "@/components/watson-board/MovementMap";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline Replay — Watson-Board" }, { name: "description", content: "Cinematic timeline & movement replay." }] }),
  component: () => (
    <Shell>
      <div className="flex flex-col gap-4 p-5">
        <TimelineReplay />
        <MovementMap />
      </div>
    </Shell>
  ),
});
