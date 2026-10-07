import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import { ChartTooltip, Freshness, KpiGrid, Panel, PageHeader, PriorityPill, QueryState, SeverityIcon, axisProps, NextStep, Pill } from "@/components/app/primitives";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Overview — InsightDI" },
    { name: "description", content: "Business health at a glance: KPIs, alerts, trends and top actions." },
    { property: "og:title", content: "Overview — InsightDI" },
    { property: "og:description", content: "Business health at a glance: KPIs, alerts, trends and top actions." },
  ] }),
  component: Overview,
});

function Overview() {
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const d = q.data;
  return (
    <>
      <PageHeader step="Step 1 · Monitor" title="Business overview" description={d?.health_summary ?? "How your business is doing right now."} />
      <KpiGrid kpis={d?.kpis} links={{ revenue: "/analytics", orders: "/analytics", margin: "/analytics", aov: "/analytics" }} />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Revenue trend" subtitle="Actual vs forecast" className="lg:col-span-2">
          <QueryState q={q}>{(o) => (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={o.revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                <YAxis tickFormatter={(v) => fmt(v, "currency")} {...axisProps} width={60} />
                <Tooltip content={<ChartTooltip unit="currency" />} labelFormatter={shortDate} />
                <Area dataKey="actual" name="Actual" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.15} strokeWidth={2} />
                <Area dataKey="forecast" name="Forecast" stroke="var(--color-chart-2)" fill="none" strokeDasharray="5 4" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}</QueryState>
        </Panel>
        <Panel title="Alerts" subtitle="Needs attention">
          <QueryState q={q} height={200}>{(o) => (
            <ul className="space-y-4">{o.alerts.map((a) => (
              <li key={a.id} className="flex gap-3"><SeverityIcon severity={a.severity} /><div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.detail}</p></div></li>
            ))}</ul>
          )}</QueryState>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Top products">
          <QueryState q={q} height={160}>{(o) => <ProductList items={o.top_products} />}</QueryState>
        </Panel>
        <Panel title="Lagging products">
          <QueryState q={q} height={160}>{(o) => <ProductList items={o.bottom_products} />}</QueryState>
        </Panel>
        <Panel title="Inventory risk">
          <QueryState q={q} height={160}>{(o) => (
            <ul className="space-y-3">{o.inventory_alerts.map((i) => (
              <li key={i.sku} className="flex items-center justify-between gap-2 text-sm">
                <div><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.stock} units · {i.days_of_cover} days cover</p></div>
                <Pill tone={i.risk === "stockout" ? "critical" : i.risk === "overstock" ? "warning" : "good"}>{i.risk}</Pill>
              </li>
            ))}</ul>
          )}</QueryState>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Competitive position" footer={d && <Freshness source="Amazon & Flipkart" at={d.competitive_summary.last_collected} />} actions={<Link to="/competition" className="text-xs font-semibold text-analytics">View</Link>}>
          <QueryState q={q} height={100}>{(o) => (
            <div className="grid grid-cols-3 gap-3 text-center">
              {([["Cheaper", o.competitive_summary.cheaper, "text-success"], ["Matched", o.competitive_summary.matched, "text-analytics"], ["Pricier", o.competitive_summary.pricier, "text-critical"]] as const).map(([l, v, c]) => (
                <div key={l} className="rounded-lg bg-muted p-3"><p className={`font-display text-2xl font-bold ${c}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
              ))}
            </div>
          )}</QueryState>
        </Panel>
        <Panel title="Top recommendations" className="lg:col-span-2" actions={<Link to="/recommendations" className="text-xs font-semibold text-analytics">See all</Link>}>
          <QueryState q={q} height={140}>{(o) => (
            <ul className="divide-y divide-border">{o.top_recommendations.slice(0, 3).map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3 first:pt-0"><div><p className="text-sm font-medium">{r.action}</p><p className="text-xs text-muted-foreground">{r.expected_impact}</p></div><PriorityPill p={r.priority} /></li>
            ))}</ul>
          )}</QueryState>
        </Panel>
      </div>
      <NextStep to="/analytics" label="Dig into business analytics" description="See sales, products, customers, inventory and marketing in detail." />
    </>
  );
}

function ProductList({ items }: { items: { sku: string; name: string; revenue: number; change_pct: number }[] }) {
  return (
    <ul className="space-y-3">{items.map((p) => (
      <li key={p.sku} className="flex items-center justify-between text-sm">
        <span className="truncate font-medium">{p.name}</span>
        <span className="tabular text-right"><span className="font-semibold">{fmt(p.revenue, "currency")}</span> <span className={p.change_pct >= 0 ? "text-success" : "text-critical"}>{p.change_pct >= 0 ? "+" : ""}{p.change_pct.toFixed(1)}%</span></span>
      </li>
    ))}</ul>
  );
}
