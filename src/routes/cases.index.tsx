import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";
import { CaseTable } from "@/components/watson-board/CaseTable";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — Watson-Board" },
      { name: "description", content: "Browse all investigations." },
    ],
  }),
  component: () => (
    <Shell>
      <div className="space-y-4 p-5">
        <h1 className="text-xl font-semibold text-gradient">All Cases</h1>
        <CaseTable />
      </div>
    </Shell>
  ),
});
