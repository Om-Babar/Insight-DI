import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import { ChartTooltip, Freshness, KpiGrid, Panel, PriorityPill, QueryState, SeverityIcon, axisProps, Pill } from "@/components/app/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Severity, Kpi } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — InsightDI" },
      { name: "description", content: "Business health at a glance: KPIs, alerts, trends and top actions." },
      { property: "og:title", content: "Overview — InsightDI" },
      { property: "og:description", content: "Business health at a glance: KPIs, alerts, trends and top actions." },
    ]
  }),
  component: Overview,
});

function Overview() {
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const d = q.data;

  // Global Date Filter State
  const [range, setRange] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Extract trend data points
  const allTrend = useMemo(() => d?.revenue_trend || [], [d?.revenue_trend]);
  const actualTrend = useMemo(() => allTrend.filter((p) => p.actual !== null && p.actual !== undefined), [allTrend]);
  const forecastPoints = useMemo(() => allTrend.filter((p) => p.forecast !== null && p.forecast !== undefined), [allTrend]);

  // Dataset date bounds
  const datasetLatestDateStr = useMemo(() => {
    if (actualTrend.length > 0) return actualTrend[actualTrend.length - 1].date;
    if (d?.as_of) return d.as_of.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }, [actualTrend, d?.as_of]);

  const datasetEarliestDateStr = useMemo(() => {
    if (actualTrend.length > 0) return actualTrend[0].date;
    return datasetLatestDateStr;
  }, [actualTrend, datasetLatestDateStr]);

  // Dynamic start date calculation based on available dataset dates
  const startDateStr = useMemo(() => {
    const latest = new Date(datasetLatestDateStr);
    if (range === "7d") {
      const d7 = new Date(latest);
      d7.setDate(latest.getDate() - 6);
      const str = d7.toISOString().slice(0, 10);
      return str < datasetEarliestDateStr ? datasetEarliestDateStr : str;
    }
    if (range === "30d") {
      const d30 = new Date(latest);
      d30.setDate(latest.getDate() - 29);
      const str = d30.toISOString().slice(0, 10);
      return str < datasetEarliestDateStr ? datasetEarliestDateStr : str;
    }
    if (range === "90d") {
      const d90 = new Date(latest);
      d90.setDate(latest.getDate() - 89);
      const str = d90.toISOString().slice(0, 10);
      return str < datasetEarliestDateStr ? datasetEarliestDateStr : str;
    }
    if (range === "ytd") {
      // Calculate Year to Date dynamically from available dates in the dataset's latest year
      const year = latest.getFullYear();
      const ytdStart = `${year}-01-01`;
      return datasetEarliestDateStr > ytdStart ? datasetEarliestDateStr : ytdStart;
    }
    if (range === "custom") {
      return customStart || datasetEarliestDateStr;
    }
    return datasetEarliestDateStr;
  }, [range, datasetLatestDateStr, datasetEarliestDateStr, customStart]);

  const endDateStr = useMemo(() => {
    if (range === "custom") {
      return customEnd || datasetLatestDateStr;
    }
    return datasetLatestDateStr;
  }, [range, customEnd, datasetLatestDateStr]);

  // Filter actual trend data within active date range
  const filteredActuals = useMemo(() => {
    return actualTrend.filter((p) => p.date >= startDateStr && p.date <= endDateStr);
  }, [actualTrend, startDateStr, endDateStr]);

  // Chart data: filtered historical actuals + future forecast trajectory
  const filteredChartData = useMemo(() => {
    const pureForecast = forecastPoints.filter((fp) => fp.actual === null || fp.actual === undefined);
    return [...filteredActuals, ...pureForecast];
  }, [filteredActuals, forecastPoints]);

  // Calculate dynamic metrics based on selected date range
  const filteredRevenue = useMemo(() => {
    return filteredActuals.reduce((acc, p) => acc + (p.actual || 0), 0);
  }, [filteredActuals]);

  const revenueChangePct = useMemo(() => {
    const len = filteredActuals.length;
    if (len === 0) return d?.kpis?.find((k) => k.key === "revenue")?.change_pct ?? 8.4;
    const priorActuals = actualTrend.filter((p) => p.date < startDateStr).slice(-len);
    const priorRev = priorActuals.reduce((acc, p) => acc + (p.actual || 0), 0);
    if (priorRev > 0) {
      return ((filteredRevenue - priorRev) / priorRev) * 100;
    }
    return d?.kpis?.find((k) => k.key === "revenue")?.change_pct ?? 8.4;
  }, [filteredActuals, actualTrend, startDateStr, filteredRevenue, d?.kpis]);

  const baseRevenue = d?.kpis?.find((k) => k.key === "revenue")?.value ?? 2614000;
  const baseOrders = d?.kpis?.find((k) => k.key === "orders")?.value ?? 3482;
  const avgOrderVal = baseRevenue / (baseOrders || 1);
  const calculatedOrders = Math.round(filteredRevenue > 0 ? filteredRevenue / avgOrderVal : baseOrders);
  const ordersChangePct = d?.kpis?.find((k) => k.key === "orders")?.change_pct ?? 5.1;
  const marginVal = d?.kpis?.find((k) => k.key === "margin")?.value ?? 21.6;

  // Value at Risk calculation
  const stockoutAlerts = d?.inventory_alerts?.filter((i) => i.risk === "stockout") || [];
  const stockoutCount = stockoutAlerts.length || 3;
  const invRecommendation = d?.top_recommendations?.find((r) => r.category === "inventory" && r.impact_value);
  const estimatedValueAtRisk = invRecommendation?.impact_value || 420000;

  // Range text for display
  const rangeDisplayLabel = useMemo(() => {
    if (range === "7d") return "Last 7 Days";
    if (range === "30d") return "Last 30 Days";
    if (range === "90d") return "Last 90 Days";
    if (range === "ytd") return "Year to Date";
    return "Custom Range";
  }, [range]);

  const rangePeriodText = useMemo(() => {
    return `${shortDate(startDateStr)} – ${shortDate(endDateStr)}`;
  }, [startDateStr, endDateStr]);

  // Construct dynamic KPI cards
  const displayKpis: Kpi[] = useMemo(() => {
    const rangeTag = range === "7d" ? "(7d)" : range === "30d" ? "(30d)" : range === "90d" ? "(90d)" : range === "ytd" ? "(YTD)" : "";
    return [
      {
        key: "revenue",
        label: `Revenue ${rangeTag}`.trim(),
        value: filteredRevenue > 0 ? filteredRevenue : baseRevenue,
        unit: "currency",
        change_pct: revenueChangePct,
        status: revenueChangePct >= 0 ? "good" : "warning",
      },
      {
        key: "orders",
        label: `Orders ${rangeTag}`.trim(),
        value: calculatedOrders,
        unit: "number",
        change_pct: ordersChangePct,
        status: ordersChangePct >= 0 ? "good" : "warning",
      },
      {
        key: "margin",
        label: "Profit margin",
        value: marginVal,
        unit: "percent",
        change_pct: d?.kpis?.find((k) => k.key === "margin")?.change_pct ?? -2.3,
        status: "warning",
        hint: "Down from 23.9% last month",
      },
      {
        key: "inventory",
        label: "VALUE AT RISK",
        value: estimatedValueAtRisk,
        unit: "currency",
        change_pct: 12.5,
        status: "critical",
        hint: `${stockoutCount} products at stockout risk`,
      },
    ];
  }, [range, filteredRevenue, baseRevenue, revenueChangePct, calculatedOrders, ordersChangePct, marginVal, d?.kpis, estimatedValueAtRisk, stockoutCount]);

  // Forecast Conclusion derived from real forecast data points
  const forecastConclusion = useMemo(() => {
    if (!forecastPoints.length) {
      return "Revenue is expected to remain stable over the next 14 days, with consistent demand trajectory.";
    }
    const horizon = forecastPoints.length;
    const recentActuals = actualTrend.slice(-horizon);
    const sumActual = recentActuals.reduce((acc, p) => acc + (p.actual || 0), 0);
    const sumForecast = forecastPoints.reduce((acc, p) => acc + (p.forecast || 0), 0);
    const pct = sumActual > 0 ? ((sumForecast - sumActual) / sumActual) * 100 : 0;

    let outlook = "remain stable";
    if (pct >= 2.5) {
      outlook = "grow";
    } else if (pct <= -2.5) {
      outlook = "soften";
    }

    const sign = pct >= 0 ? "+" : "";
    return `Revenue is expected to ${outlook} over the next ${horizon} days, with a projected ${sign}${pct.toFixed(1)}% change.`;
  }, [forecastPoints, actualTrend]);

  // Competitive advantage percentage
  const compSummary = d?.competitive_summary || { cheaper: 0, matched: 0, pricier: 0 };
  const compTotal = (compSummary.cheaper || 0) + (compSummary.matched || 0) + (compSummary.pricier || 0) || 1;
  const compAdvantage = Math.round(((compSummary.cheaper || 0) / compTotal) * 100);

  // Prioritize alerts: critical -> warning -> info -> positive
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  const sortedAlerts = d?.alerts?.slice().sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) || [];
  const topRecommendations = d?.top_recommendations?.slice(0, 3) || [];

  return (
    <>
      {/* 1. EXECUTIVE OVERVIEW + SUMMARY TEXT */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-foreground sm:text-[28px]">Executive Overview</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {d?.health_summary ?? "How your business is doing right now across sales, margins, inventory, and market competitors."}
        </p>
      </div>

      {/* 2. BUSINESS HEALTH (BELOW Executive Overview title + summary text) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success ring-4 ring-success/20" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Health:</span>
          <Pill tone="good">Healthy</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Revenue: <strong className="text-foreground">Healthy ({revenueChangePct >= 0 ? "+" : ""}{revenueChangePct.toFixed(1)}%)</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-warning" />
            Profitability: <strong className="text-foreground">{marginVal.toFixed(1)}% margin</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-critical" />
            Inventory: <strong className="text-critical">{stockoutCount} at risk</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-analytics" />
            Competition: <strong className="text-foreground">{compAdvantage}% advantage</strong>
          </span>
        </div>
      </div>

      {/* 3. GLOBAL DATE FILTER (Aligned with header area, visually compact) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <Calendar className="size-4 text-analytics" />
          <span>Active Period:</span>
          <span className="font-semibold text-foreground">{rangeDisplayLabel}</span>
          <span className="text-muted-foreground">({rangePeriodText})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-8 w-44 text-xs bg-background">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-analytics"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-analytics"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN KPI ROW (Revenue, Orders, Profit Margin, VALUE AT RISK) */}
      <KpiGrid
        kpis={displayKpis}
        links={{
          revenue: "/analytics",
          orders: "/analytics",
          margin: "/analytics",
          inventory: "/analytics",
          profit: "/analytics",
        }}
      />

      {/* PRIORITY 2 & 3: Important Alerts & Top Actions (Decision Brief) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Action Required"
          subtitle="Prioritized alerts"
          actions={<Link to="/analytics" className="text-xs font-semibold text-analytics hover:underline">View all</Link>}
        >
          <QueryState q={q} height={200}>
            {() => (
              <ul className="space-y-4">
                {sortedAlerts.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <SeverityIcon severity={a.severity} />
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Panel>

        <Panel
          title="Top Recommendations"
          subtitle="Top prescribed actions"
          actions={<Link to="/recommendations" className="text-xs font-semibold text-analytics hover:underline">See prescriptions</Link>}
        >
          <QueryState q={q} height={200}>
            {() => (
              <ul className="divide-y divide-border">
                {topRecommendations.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <Link to="/recommendations" className="text-sm font-medium hover:underline text-foreground">{r.action}</Link>
                      <PriorityPill p={r.priority} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span><span className="font-semibold text-foreground">Impact:</span> {r.expected_impact}</span>
                      <span>Conf: {(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Panel>
      </div>

      {/* PRIORITY 4: Performance (Actual vs Forecast) + Forecast Conclusion */}
      <div className="mt-6 grid gap-6">
        <Panel
          title="Revenue Forecast"
          subtitle="Actual performance vs predictive trajectory"
          actions={<Link to="/forecasting" className="text-xs font-semibold text-analytics hover:underline">Simulate scenarios</Link>}
        >
          <QueryState q={q}>
            {() => (
              <div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={filteredChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                    <YAxis tickFormatter={(v) => fmt(v, "currency")} {...axisProps} width={60} />
                    <Tooltip content={<ChartTooltip unit="currency" />} labelFormatter={shortDate} />

                    {/* Confidence Range visualization using overlapping background areas */}
                    <Area dataKey="upper" name="Confidence (High)" stroke="none" fill="var(--color-chart-2)" fillOpacity={0.08} isAnimationActive={false} />
                    <Area dataKey="lower" name="Confidence (Low)" stroke="none" fill="var(--color-background)" fillOpacity={1} isAnimationActive={false} />

                    <Area dataKey="actual" name="Actual Revenue" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.15} strokeWidth={2} />
                    <Area dataKey="forecast" name="Forecast" stroke="var(--color-chart-2)" fill="none" strokeDasharray="5 4" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* 5. FORECAST CONCLUSION DIRECTLY BELOW CHART */}
                <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="mt-0.5 size-2 shrink-0 rounded-full bg-analytics" />
                  <p className="leading-relaxed">
                    <span className="font-semibold text-foreground">Forecast Conclusion:</span>{" "}
                    {forecastConclusion}
                  </p>
                </div>
              </div>
            )}
          </QueryState>
        </Panel>
      </div>

      {/* PRIORITY 5 & 6: Products/Inventory & Competition */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Underperforming Products */}
        <Panel title="Underperforming Products" actions={<Link to="/analytics" className="text-xs font-semibold text-analytics hover:underline">Drill down</Link>}>
          <QueryState q={q} height={160}>{(o) => <ProductList items={o.bottom_products} />}</QueryState>
        </Panel>

        {/* Inventory Risk */}
        <Panel title="Inventory Risk" actions={<Link to="/analytics" className="text-xs font-semibold text-analytics hover:underline">View logistics</Link>}>
          <QueryState q={q} height={160}>{(o) => {
            const stockouts = o.inventory_alerts.filter((i) => i.risk === "stockout").length;
            const overstocks = o.inventory_alerts.filter((i) => i.risk === "overstock").length;
            return (
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted p-3">
                  <div className="text-center w-1/2">
                    <p className="font-display text-lg font-bold text-critical">{stockouts}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Stockouts</p>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div className="text-center w-1/2">
                    <p className="font-display text-lg font-bold text-warning">{overstocks}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Overstocked</p>
                  </div>
                </div>
                <ul className="flex-1 space-y-3 overflow-hidden">
                  {o.inventory_alerts.slice(0, 3).map((i) => (
                    <li key={i.sku} className="flex items-center justify-between gap-2 text-sm">
                      <div className="truncate">
                        <p className="truncate font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{i.stock} units · {i.days_of_cover}d cover</p>
                      </div>
                      <Pill tone={i.risk === "stockout" ? "critical" : i.risk === "overstock" ? "warning" : "good"}>{i.risk}</Pill>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }}</QueryState>
        </Panel>

        {/* Competitive Position */}
        <Panel
          title="Competitive Position"
          footer={d && <Freshness source="Amazon & Flipkart" at={d.competitive_summary?.last_collected || d.as_of} />}
          actions={<Link to="/competition" className="text-xs font-semibold text-analytics hover:underline">View matrix</Link>}
        >
          <QueryState q={q} height={160}>{(o) => {
            const sum = o?.competitive_summary || { cheaper: 0, matched: 0, pricier: 0 };
            const total = (sum.cheaper || 0) + (sum.matched || 0) + (sum.pricier || 0) || 1;
            return (
              <div className="flex h-full flex-col justify-center gap-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-success-soft/30 p-3">
                    <p className="font-display text-2xl font-bold text-success">{sum.cheaper || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Undercutting</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-display text-2xl font-bold text-foreground">{sum.matched || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Matched</p>
                  </div>
                  <div className="rounded-lg bg-critical-soft/30 p-3">
                    <p className="font-display text-2xl font-bold text-critical">{sum.pricier || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Overpriced</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{((sum.cheaper / total) * 100).toFixed(0)}% competitive advantage</span>
                  <span>{((sum.pricier / total) * 100).toFixed(0)}% at risk</span>
                </div>
              </div>
            );
          }}</QueryState>
        </Panel>
      </div>
    </>
  );
}

function ProductList({ items }: { items: { sku: string; name: string; revenue: number; change_pct: number; margin_pct?: number }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li key={p.sku} className="flex items-center justify-between text-sm">
          <Link to="/analytics" className="truncate font-medium hover:underline flex-1">{p.name}</Link>
          <div className="flex flex-col items-end shrink-0 pl-2">
            <span className="tabular font-semibold text-foreground">{fmt(p.revenue, "currency")}</span>
            <div className="flex items-center gap-2 text-[11px]">
              {p.margin_pct !== undefined && <span className="text-muted-foreground">{p.margin_pct.toFixed(1)}% mgn</span>}
              <span className={p.change_pct >= 0 ? "text-success" : "text-critical"}>
                {p.change_pct >= 0 ? "+" : ""}{p.change_pct.toFixed(1)}%
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
