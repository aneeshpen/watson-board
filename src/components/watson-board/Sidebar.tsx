import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderSearch, Network, Clock, Map,
  Bot, Bell, FileBarChart, Settings, ShieldHalf,
} from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { to: "/", label: "Command Center", icon: LayoutDashboard },
  { to: "/cases", label: "Cases", icon: FolderSearch },
  { to: "/cases/C-2041", label: "Investigation Graph", icon: Network },
  { to: "/timeline", label: "Timeline Replay", icon: Clock },
  { to: "/heatmap", label: "Heatmaps", icon: Map },
  { to: "/copilot", label: "AI Copilot", icon: Bot },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  // { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="z-20 flex w-[68px] shrink-0 flex-col items-center justify-between border-r border-sidebar-border bg-sidebar/80 py-4 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-2">
        <Link to="/" className="group relative mb-3 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-neon-2/30 neon-border">
          <ShieldHalf className="h-5 w-5 text-primary" />
          <span className="absolute -inset-1 rounded-xl opacity-0 transition group-hover:opacity-100 glow-primary" />
        </Link>

        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to.split("/").slice(0,2).join("/"));
          return (
            <Link key={to} to={to} className="group relative">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={[
                  "grid h-10 w-10 place-items-center rounded-lg border transition-colors",
                  active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-transparent text-muted-foreground hover:border-primary/35 hover:bg-secondary/40 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" />
              </motion.div>
              <span className="pointer-events-none absolute left-12 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs opacity-0 shadow-lg transition group-hover:opacity-100">
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-neon-2/45 bg-primary/20 text-xs font-semibold text-sidebar-foreground">
            RK
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-sidebar animate-pulse-ring" />
        </div>
      </div>
    </aside>
  );
}
