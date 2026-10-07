import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bell, Bot, Brain, Database, FileText, FlaskConical, LayoutDashboard, Lightbulb, Menu, Search, Swords, TrendingUp, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { api, isPreviewMode } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SeverityIcon } from "./primitives";
import { timeAgo } from "@/lib/format";

const nav = [
  { group: "Monitor", items: [
    { to: "/", label: "Overview", Icon: LayoutDashboard },
    { to: "/data-sources", label: "Data Sources", Icon: Database },
    { to: "/analytics", label: "Business Analytics", Icon: BarChart3 },
  ] },
  { group: "Understand", items: [
    { to: "/forecasting", label: "Forecasting", Icon: TrendingUp },
    { to: "/competition", label: "Competitive Intel", Icon: Swords },
    { to: "/root-cause", label: "Root Cause", Icon: Search },
  ] },
  { group: "Act", items: [
    { to: "/recommendations", label: "Recommendations", Icon: Lightbulb },
    { to: "/simulation", label: "What-If Simulation", Icon: FlaskConical },
    { to: "/copilot", label: "AI Copilot", Icon: Bot },
    { to: "/reports", label: "Reports", Icon: FileText },
  ] },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {nav.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <li key={to}>
                  <Link to={to} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
                    <Icon className="size-4" />{label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Brain className="size-4" /></span>
      <div>
        <p className="font-display text-base font-bold text-sidebar-foreground">InsightDI</p>
        <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Decision intelligence</p>
      </div>
    </div>
  );
}

function Alerts() {
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const alerts = q.data?.alerts ?? [];
  return (
    <Popover>
      <PopoverTrigger className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted" aria-label="Alerts">
        <Bell className="size-4" />
        {alerts.length > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-critical text-[10px] font-bold text-primary-foreground">{alerts.length}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">Alerts</p>
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {alerts.map((a) => (
            <li key={a.id} className="flex gap-3 px-4 py-3">
              <SeverityIcon severity={a.severity} />
              <div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.detail}</p><p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</p></div>
            </li>
          ))}
          {!alerts.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No alerts</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand /><NavList />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar">
            <button className="absolute right-3 top-5 text-sidebar-foreground" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
            <Brand /><NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="flex-1" />
          {isPreviewMode && <span className="hidden rounded-md bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning sm:inline">Preview data — server not connected</span>}
          <Alerts />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
