import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Info,
  Package,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { fmt, fullTime, shortDate, timeAgo } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Pill, QueryState, axisProps } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forecasting")({
  head: () => ({
    meta: [
      { title: "Revenue Forecast — InsightDI" },
      {
        name: "description",
        content: "Business-focused revenue forecasting with empirical uncertainty bounds, seasonal patterns, and actionable growth scenarios.",
      },
      { property: "og:title", content: "Revenue Forecast — InsightDI" },
      {
        property: "og:description",
        content: "Business-focused revenue forecasting with empirical uncertainty bounds, seasonal patterns, and actionable growth scenarios.",
      },
    ],
  }),
  component: Forecasting,
});

function Forecasting() {
  const [horizon, setHorizon] = useState<number>(30);
  const [model, setModel] = useState<string>("auto");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  const q = useQuery({
    queryKey: ["forecast", horizon, model],
    queryFn: () => api.forecast(horizon, model),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      {/* 1. Page Heading */}
      <PageHeader
        title="Revenue Forecast"
        description="Forward-looking revenue projections, empirical uncertainty bounds, and decision-ready growth actions for e-commerce owners."
      />

      <QueryState q={q}>
        {(d) => {
          const isUp = d.expected_change_pct >= 0;
          const avgDaily = d.horizon_days > 0 ? d.expected_total / d.horizon_days : 0;
          const histAvgDaily = d.horizon_days > 0 ? d.previous_period_revenue / d.horizon_days : 0;
          const latestActualDate = d.latest_actual_date || d.data_freshness_date || "";
          const forecastStartDate = d.forecast_start_date || "";
          const forecastEndDate = d.forecast_end_date || "";

          // Prepare chart data ensuring historical points and forecast points are clearly distinguished
          const chartData = d.series.map((p) => {
            const isHistorical = latestActualDate ? p.date <= latestActualDate : p.actual != null;
            return {
              date: p.date,
              actual: isHistorical ? p.actual : null,
              forecast: !isHistorical ? p.forecast : null,
              range: !isHistorical && p.lower != null && p.upper != null ? [p.lower, p.upper] : null,
              lower: !isHistorical ? p.lower : null,
              upper: !isHistorical ? p.upper : null,
            };
          });

          return (
            <div className="space-y-6">
              {/* Data Staleness Warning Banner */}
              {d.is_data_stale && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950 dark:text-amber-100">
                      Historical Transaction Data Notice ({d.data_stale_days ? `${d.data_stale_days} days since latest transaction` : "Archived Data"})
                    </p>
                    <p className="mt-0.5 leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                      The underlying database contains verified actual sales up to <strong>{latestActualDate ? shortDate(latestActualDate) : "31 Dec 2024"}</strong>.
                      Projections begin from the next day (<strong>{forecastStartDate ? shortDate(forecastStartDate) : "01 Jan 2025"}</strong> to <strong>{forecastEndDate ? shortDate(forecastEndDate) : "30 Jan 2025"}</strong>), not today's calendar date.
                      To forecast from current real-world sales, ingest new order files in <Link to="/data-sources" className="underline font-semibold hover:text-amber-950">Data Sources</Link>.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Forecast Controls & Timeline Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5 px-3.5 text-xs shadow-xs">
                {/* Left: Configuration Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground shadow-2xs hover:border-border/80 transition-colors">
                    <Calendar className="size-3.5 text-emerald-600" />
                    <span className="font-medium text-foreground">Forecast Horizon:</span>
                    <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
                      <SelectTrigger className="h-6 w-28 border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Next 7 days</SelectItem>
                        <SelectItem value="30">Next 30 days</SelectItem>
                        <SelectItem value="90">Next 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground shadow-2xs hover:border-border/80 transition-colors">
                    <Sparkles className="size-3.5 text-emerald-600" />
                    <span className="font-medium text-foreground">Model:</span>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="h-6 w-44 border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Best Tested Model)</SelectItem>
                        <SelectItem value="xgboost">XGBoost Regressor</SelectItem>
                        <SelectItem value="random_forest">Random Forest</SelectItem>
                        <SelectItem value="arima">ARIMA (1,1,1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right: Operational Timeline & Baseline Context Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-slate-500" />
                    <span>Latest Actual:</span>
                    <span className="font-semibold text-foreground">
                      {latestActualDate ? shortDate(latestActualDate) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium">Forecast Period:</span>
                    <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                      {forecastStartDate ? shortDate(forecastStartDate) : "—"} – {forecastEndDate ? shortDate(forecastEndDate) : `Next ${d.horizon_days}d`}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-muted-foreground"
                    title={`Preceding ${d.horizon_days}d Actuals (${d.previous_period_start_date ? shortDate(d.previous_period_start_date) : ""} – ${d.previous_period_end_date ? shortDate(d.previous_period_end_date) : ""}: ${fmt(d.previous_period_revenue, "currency")})`}
                  >
                    <span>Baseline:</span>
                    <span className="font-semibold text-foreground">
                      Prior {d.horizon_days}d ({fmt(d.previous_period_revenue, "currency")})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3 text-muted-foreground" />
                    <span>Run: {d.generated_at ? fullTime(d.generated_at) : "Just now"}</span>
                  </div>
                </div>
              </div>

              {/* 3. Business-Focused KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Expected Revenue */}
                <div className="surface flex flex-col justify-between p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Revenue</p>
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {d.horizon_days}d Forecast
                      </span>
                    </div>
                    <p className="mt-2.5 font-display text-[28px] font-bold tracking-tight text-foreground">
                      {fmt(d.expected_total, "currency")}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    Avg. <span className="font-semibold text-foreground">{fmt(avgDaily, "currency")}</span>/day (vs {fmt(histAvgDaily, "currency")}/day past)
                  </div>
                </div>

                {/* Change vs Previous Period */}
                <div className="surface flex flex-col justify-between p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change vs Previous Period</p>
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isUp ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                        {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {isUp ? "Expansion" : "Normalization"}
                      </span>
                    </div>
                    <p className={`mt-2.5 font-display text-[28px] font-bold tracking-tight ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {isUp ? "+" : ""}{d.expected_change_pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {isUp ? "+" : ""}{fmt(d.expected_change_abs, "currency")}
                    </span>
                    <span>vs prior {d.horizon_days}d</span>
                  </div>
                </div>

                {/* Estimated Revenue Range */}
                <div className="surface flex flex-col justify-between p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated Revenue Range</p>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground" title="Empirical bounds derived from holdout model prediction variance (±1.65× RMSE)">
                        Residual Bounds
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="font-display text-[22px] font-bold text-foreground">
                        {fmt(d.total_lower_bound, "currency")}
                      </span>
                      <span className="text-xs text-muted-foreground">to</span>
                      <span className="font-display text-[22px] font-bold text-foreground">
                        {fmt(d.total_upper_bound, "currency")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    Variance bound (±{fmt(Math.abs(d.total_upper_bound - d.expected_total), "currency")})
                  </div>
                </div>

                {/* Data Freshness & Run */}
                <div className="surface flex flex-col justify-between p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Freshness & Run</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Synchronized
                      </span>
                    </div>
                    <p className="mt-2.5 font-display text-[22px] font-bold text-foreground">
                      {latestActualDate ? shortDate(latestActualDate) : "31 Dec 2024"}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    Forecast computed {d.generated_at ? timeAgo(d.generated_at) : "recently"}
                  </div>
                </div>
              </div>

              {/* 4. Revenue Forecast Chart */}
              <Panel
                title="Revenue Trajectory & Estimated Range"
                subtitle="Historical actual daily revenue leading up to the forecast start date, followed by model projections. Shaded band illustrates holdout residual uncertainty."
                actions={
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-slate-700 dark:bg-slate-300" />
                      <span>Historical Actuals</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 border-b-2 border-dashed border-emerald-500" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Projected Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-3 rounded-xs bg-emerald-500/15" />
                      <span>Estimated Range</span>
                    </div>
                  </div>
                }
              >
                <div className="mt-2">
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                      <defs>
                        <linearGradient id="forecastRangeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                      <YAxis
                        {...axisProps}
                        width={75}
                        tickFormatter={(v) => fmt(v, "currency")}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0]?.payload;
                          const isHistorical = latestActualDate ? String(label) <= latestActualDate : pt?.actual != null;

                          return (
                            <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs">
                              <p className="font-semibold text-foreground mb-1.5">
                                {label ? shortDate(String(label)) : ""}
                                <span className="ml-1.5 font-normal text-muted-foreground">
                                  ({isHistorical ? "Verified Actual" : "Projected Estimate"})
                                </span>
                              </p>
                              <div className="space-y-1">
                                {isHistorical && pt?.actual != null && (
                                  <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                      <span className="size-2 rounded-full bg-slate-700 dark:bg-slate-300" />
                                      Actual Revenue:
                                    </span>
                                    <span className="tabular font-bold text-foreground">
                                      ₹{Math.round(pt.actual).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                                {!isHistorical && pt?.forecast != null && (
                                  <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="size-2 rounded-full bg-emerald-500" />
                                      Projected Revenue:
                                    </span>
                                    <span className="tabular font-bold">
                                      ₹{Math.round(pt.forecast).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                                {!isHistorical && pt?.lower != null && pt?.upper != null && (
                                  <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                                    <span>Estimated Range:</span>
                                    <span className="tabular font-medium text-foreground">
                                      ₹{Math.round(pt.lower).toLocaleString("en-IN")} – ₹{Math.round(pt.upper).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                      {forecastStartDate && (
                        <ReferenceLine
                          x={forecastStartDate}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Forecast Starts (${shortDate(forecastStartDate)})`,
                            position: "top",
                            fill: "#10b981",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Area
                        dataKey="range"
                        name="Estimated Range"
                        stroke="none"
                        fill="url(#forecastRangeGradient)"
                      />
                      <Line
                        dataKey="actual"
                        name="Historical Actual"
                        stroke="var(--color-primary)"
                        strokeWidth={2.2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 4, strokeWidth: 1.5 }}
                      />
                      <Line
                        dataKey="forecast"
                        name="Projected Revenue"
                        stroke="#10b981"
                        strokeDasharray="5 4"
                        strokeWidth={2.4}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 4, stroke: "#10b981", strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* 5. Business Insights and Recommended Actions */}
              <div className="surface p-5 shadow-xs">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-[16px] font-bold text-foreground">Business Insights & Actions</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Analytical findings computed directly from model projections and historical order patterns.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="size-3" />
                    Evidence-Grounded Intelligence
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Insight 1: Trajectory */}
                  <div className="rounded-xl border border-border bg-card/60 p-4 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex size-6 items-center justify-center rounded-md ${isUp ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>
                        {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        {d.insights[0]?.title || `Expected Revenue ${isUp ? "Expansion" : "Normalization"}`}
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {d.insights[0]?.description ||
                        `Revenue is forecast at ${fmt(d.expected_total, "currency")} over the next ${d.horizon_days} days (${isUp ? "+" : ""}${d.expected_change_pct.toFixed(1)}% vs preceding ${d.horizon_days}d). Run-rate paces at ${fmt(avgDaily, "currency")}/day.`}
                    </p>
                  </div>

                  {/* Insight 2: Seasonality & Peak Days */}
                  <div className="rounded-xl border border-border bg-card/60 p-4 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-analytics-soft text-analytics">
                        <BarChart2 className="size-3.5" />
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        {d.insights[1]?.title || "Intra-Week Variation & Projected Peak Days"}
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {d.insights[1]?.description ||
                        "Model predictions reflect intra-week demand variations across Saturdays and Sundays versus weekdays. Align dispatch staffing with peak days."}
                    </p>
                  </div>

                  {/* Insight 3: Fulfillment & Inventory Review (Prudent and qualified) */}
                  <div className="rounded-xl border border-border bg-card/60 p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600">
                          <Package className="size-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-foreground">
                          {d.insights[2]?.title || "Inventory & Operational Readiness Review"}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {d.insights[2]?.description ||
                          "Higher projected order activity around weekend dates indicates peak warehouse dispatch demand. Business owners should prudently review catalog stock coverage in Business Analytics → Inventory without assuming stockouts solely from top-level revenue forecasts."}
                      </p>
                    </div>
                    <div className="mt-3 pt-2">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to="/analytics" search={{ tab: "inventory" }}>
                          Review Inventory Status <ArrowRight className="ml-1 size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Insight 4: Strategic Levers & Simulation (Distinct diagnostics vs simulation) */}
                  <div className="rounded-xl border border-border bg-card/60 p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600">
                          <Sparkles className="size-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-foreground">
                          {d.insights[3]?.title || "Scenario Testing & Revenue Driver Diagnostics"}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {d.insights[3]?.description ||
                          "To test how pricing adjustments or marketing spend variations could alter this baseline revenue projection, run What-If Simulation. To investigate historical factors behind past performance, inspect Root Cause Analysis."}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 pt-2">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to="/simulation">
                          Run What-If Simulation <ArrowRight className="ml-1 size-3" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                        <Link to="/root-cause">
                          Root Cause Diagnostics
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Advanced Forecast Details (Collapsible Section - Collapsed by Default) */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">How Was This Forecast Created?</h3>
                      <p className="text-xs text-muted-foreground">
                        Technical model holdout validation, error metrics (MAPE, RMSE, R²), and model selection methodology.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      Active: {d.model}
                    </span>
                    {isAdvancedOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </div>
                </button>

                {isAdvancedOpen && (
                  <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/10">
                    {/* Model comparison table */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Holdout Benchmark Evaluation
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Evaluated on {d.models[0]?.test_days || 74} chronological holdout days (80/20 chronological split)
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-border bg-card">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                              <th className="py-2.5 px-3">Model</th>
                              <th className="py-2.5 px-3">Relative Error (MAPE)</th>
                              <th className="py-2.5 px-3">RMSE</th>
                              <th className="py-2.5 px-3">Goodness of Fit (R²)</th>
                              <th className="py-2.5 px-3">Evaluation Sample</th>
                              <th className="py-2.5 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {d.models.map((m) => (
                              <tr
                                key={m.model}
                                className={`tabular transition-colors ${m.selected ? "bg-emerald-500/5 font-medium" : "hover:bg-muted/20"}`}
                              >
                                <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                                  {m.selected && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                                  {m.model}
                                </td>
                                <td className="py-2.5 px-3">{m.mape.toFixed(1)}%</td>
                                <td className="py-2.5 px-3">₹{Math.round(m.rmse).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 font-semibold text-foreground">{m.r2.toFixed(3)}</td>
                                <td className="py-2.5 px-3 text-muted-foreground">{m.test_days || 74} days</td>
                                <td className="py-2.5 px-3 text-right">
                                  {m.selected ? (
                                    <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                      Active Model
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      Benchmarked
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Metric Glossary & Plain-English Explanations */}
                    <div className="grid gap-3 sm:grid-cols-3 pt-2">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                          <HelpCircle className="size-3 text-muted-foreground" />
                          MAPE (Mean Error %)
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Average percentage deviation between predictions and actual sales. Lower percentage indicates higher accuracy.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                          <HelpCircle className="size-3 text-muted-foreground" />
                          RMSE (Rupee Penalty)
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Rupee measure of prediction variance that penalizes large outlier mistakes. Lower is better.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                          <HelpCircle className="size-3 text-muted-foreground" />
                          R² Score (Model Fit)
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Proportion of daily sales variance captured by seasonality, day-of-week, festivals, and ad spend. 1.0 represents a perfect fit.
                        </p>
                      </div>
                    </div>

                    {/* Technical Note on Deep Sequence Models (LSTM) */}
                    <div className="rounded-lg border border-border bg-card p-3.5 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="size-3.5 text-analytics" />
                        Why is LSTM excluded from production holdout models?
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        With a single calendar year of daily observations (366 time steps), deep recurrent sequence models such as LSTM require substantially longer histories (typically 3–5 multi-annual cycles) to generalize long-term seasonal periodicity without severe overfitting. For 1-year SME datasets, feature-augmented gradient-boosted trees (XGBoost, Random Forest) and ARIMA deliver superior generalization, lower holdout error, and full interpretability.
                      </p>
                    </div>

                    {/* Non-Guarantee Governance Disclaimer */}
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <p className="leading-relaxed text-[11px]">
                        <strong>Governance Note:</strong> Statistical holdout validation measures how well models fit historical transaction patterns. It does not guarantee future market outcomes. Realized revenue can be influenced by macroeconomic trends, unobserved competitor discounting, stock-outs, or external supply chain disruptions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
