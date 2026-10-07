import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Database, Globe, Inbox, Info, RefreshCw, ShoppingCart, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmt, fullTime, timeAgo, type Unit } from "@/lib/format";
import type { Kpi, Severity, Priority } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, description, actions, step }: { title: string; description: string; actions?: ReactNode; step?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {step && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-analytics">{step}</p>}
        <h1 className="text-2xl font-bold text-foreground sm:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className, footer }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <section className={cn("surface flex flex-col", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="flex-1 p-5">{children}</div>
      {footer && <footer className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footer}</footer>}
    </section>
  );
}

const statusTone = {
  good: "text-success",
  warning: "text-warning",
  critical: "text-critical",
} as const;

export function KpiCard({ kpi, to }: { kpi: Kpi; to?: string | undefined }) {
  const up = kpi.change_pct >= 0;
  const body = (
    <div className={cn("surface group h-full p-5 transition-shadow", to && "hover:shadow-lift")}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
        <span className={cn("size-2 rounded-full", kpi.status === "good" ? "bg-success" : kpi.status === "warning" ? "bg-warning" : "bg-critical")} aria-label={`status ${kpi.status}`} />
      </div>
      <p className="tabular mt-2 font-display text-[28px] font-bold leading-none text-foreground">{fmt(kpi.value, kpi.unit)}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={cn("inline-flex items-center gap-0.5 font-semibold", statusTone[kpi.status])}>
          {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(kpi.change_pct).toFixed(1)}%
          <span className="ml-1 font-normal text-muted-foreground">vs last period</span>
        </span>
        {to && <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      {kpi.hint && <p className="mt-2 text-xs text-muted-foreground">{kpi.hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">{body}</Link> : body;
}

export function KpiGrid({ kpis, links }: { kpis?: Kpi[] | undefined; links?: Record<string, string> | undefined }) {
  if (!kpis) return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)}</div>;
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{kpis.map((k) => <KpiCard key={k.key} kpi={k} to={links?.[k.key]} />)}</div>;
}

export function LoadingBlock({ height = 280 }: { height?: number | undefined }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-critical/40 bg-critical-soft px-6 py-10 text-center">
      <XCircle className="size-6 text-critical" />
      <div>
        <p className="font-semibold text-foreground">Couldn't load this data</p>
        <p className="mt-1 text-sm text-muted-foreground">{message ?? "Something went wrong."}</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="size-3.5" /> Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Renders loading / error / empty / data for a react-query result. */
export function QueryState<D>({ q, children, empty, height }: { q: { data: D | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }; children: (d: D) => ReactNode; empty?: (d: D) => boolean; height?: number }) {
  if (q.isLoading) return <LoadingBlock height={height} />;
  if (q.isError) return <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />;
  if (q.data === undefined || (empty && empty(q.data))) return <EmptyState title="No data yet" description="Upload a dataset in Data Sources to populate this view." action={<Button asChild size="sm" variant="outline"><a href="/data-sources">Go to Data Sources</a></Button>} />;
  return <>{children(q.data)}</>;
}

const sevStyle: Record<Severity, { cls: string; Icon: typeof Info }> = {
  critical: { cls: "bg-critical-soft text-critical border-critical/25", Icon: XCircle },
  warning: { cls: "bg-warning-soft text-warning border-warning/30", Icon: AlertTriangle },
  info: { cls: "bg-analytics-soft text-analytics border-analytics/25", Icon: Info },
  positive: { cls: "bg-success-soft text-success border-success/25", Icon: CheckCircle2 },
};

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const { Icon, cls } = sevStyle[severity];
  return <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg border", cls, className)}><Icon className="size-4" /></span>;
}

export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "good" | "warning" | "critical" | "ai" | "info"; children: ReactNode; className?: string }) {
  const map = {
    neutral: "bg-muted text-muted-foreground",
    good: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    critical: "bg-critical-soft text-critical",
    ai: "bg-ai-soft text-ai",
    info: "bg-analytics-soft text-analytics",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", map[tone], className)}>{children}</span>;
}

export function PriorityPill({ p }: { p: Priority }) {
  return <Pill tone={p === "high" ? "critical" : p === "medium" ? "warning" : "neutral"}>{p} priority</Pill>;
}

export function Freshness({ source, at, status = "fresh" }: { source: string; at: string; status?: "fresh" | "stale" | "failed" }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" title={`Collected ${fullTime(at)}`}>
      <span className={cn("size-1.5 rounded-full", status === "fresh" ? "bg-success" : status === "stale" ? "bg-warning" : "bg-critical")} />
      <span className="font-medium text-foreground">{source}</span>· {status} · {timeAgo(at)}
    </span>
  );
}

export function SourceChips({ sources }: { sources: ("internal" | "competitor" | "external")[] }) {
  const m = { internal: { l: "Your business data", I: Database }, competitor: { l: "Amazon / Flipkart", I: ShoppingCart }, external: { l: "External knowledge", I: Globe } };
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((s) => { const { l, I } = m[s]; return <span key={s} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><I className="size-3" />{l}</span>; })}
    </div>
  );
}

export function NextStep({ to, label, description }: { to: string; label: string; description: string }) {
  return (
    <Link to={to} className="surface group mt-8 flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-lift">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-analytics">Next step</p>
        <p className="mt-1 font-display font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1"><ArrowRight className="size-4" /></span>
    </Link>
  );
}

export function ChartTooltip({ active, payload, label, unit = "number" }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; unit?: Unit | undefined }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.filter((p) => p.value !== null && p.value !== undefined && !Array.isArray(p.value)).map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="tabular font-semibold text-foreground">{fmt(p.value, unit, false)}</span>
        </p>
      ))}
    </div>
  );
}

export const axisProps = { tick: { fontSize: 11, fill: "var(--color-muted-foreground)" }, tickLine: false, axisLine: false } as const;
