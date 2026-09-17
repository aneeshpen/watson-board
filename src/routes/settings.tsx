import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/watson-board/Shell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Watson-Board" }, { name: "description", content: "Watson-Board platform settings." }] }),
  component: () => (
    <Shell>
      <div className="p-5">
        <h1 className="text-xl font-semibold text-gradient">Settings</h1>
        <div className="glass mt-4 max-w-xl rounded-xl p-4 text-sm text-muted-foreground">
          Configuration panel placeholder. Theme, AI sensitivity, district scoping and audit logs will appear here.
        </div>
      </div>
    </Shell>
  ),
});
