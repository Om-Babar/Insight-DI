import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  HelpCircle,
  Info,
  Layers,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import type {
  RcaData,
  RcaFactorCard,
  RcaWaterfallStep,
  RcaBreakdownItem,
  RcaDailyAnomaly,
  RcaTimelineEvent,
  RcaNextStep,
} from "@/lib/types";
import { ChartTooltip, PageHeader, Panel, Pill, QueryState, axisProps } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/root-cause")({
  head: () => ({
    meta: [
      { title: "Root Cause Analysis — InsightDI" },
      { name: "description", content: "Understand what changed in your e-commerce business, why it changed, where it happened, and what to investigate next." },
      { property: "og:title", content: "Root Cause Analysis — InsightDI" },
      { property: "og:description", content: "Understand what changed in your e-commerce business, why it changed, where it happened, and what to investigate next." },
    ],
  }),
  component: RootCausePage,
});

function RootCausePage() {
  const navigate = useNavigate();

  // URL search params initialization
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialMetric = searchParams?.get("metric") || "revenue";
  const initialPeriod = searchParams?.get("period") || "30d";
  const initialSku = searchParams?.get("sku") || searchParams?.get("product_id") || "";
  const initialCategory = searchParams?.get("category") || "";

  // ── Investigation Controls State ─────────────────────────────────────
  const [metric, setMetric] = useState<string>(initialMetric);
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>(initialSku);
  const [filterCategory, setFilterCategory] = useState<string>(initialCategory);
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");

  // Breakdown tab selection
  const [breakdownTab, setBreakdownTab] = useState<"products" | "categories" | "channels" | "segments">("products");
  const [selectedAnomalyDay, setSelectedAnomalyDay] = useState<RcaDailyAnomaly | null>(null);

  // Fetch RCA Data with real-time controls
  const queryParams = useMemo(() => ({
    metric,
    period,
    start_date: period === "custom" && startDate ? startDate : undefined,
    end_date: period === "custom" && endDate ? endDate : undefined,
    filter_product_id: filterProduct && filterProduct !== "all" ? filterProduct : undefined,
    filter_category: filterCategory && filterCategory !== "all" ? filterCategory : undefined,
    filter_channel: filterChannel && filterChannel !== "all" ? filterChannel : undefined,
    filter_segment: filterSegment && filterSegment !== "all" ? filterSegment : undefined,
  }), [metric, period, startDate, endDate, filterProduct, filterCategory, filterChannel, filterSegment]);

  const q = useQuery({
    queryKey: ["rca", queryParams],
    queryFn: () => api.rca(queryParams),
  });

  const resetFilters = () => {
    setFilterProduct("");
    setFilterCategory("all");
    setFilterChannel("all");
    setFilterSegment("all");
    setPeriod("30d");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = Boolean(
    (filterProduct && filterProduct !== "all") ||
    (filterCategory && filterCategory !== "all") ||
    (filterChannel && filterChannel !== "all") ||
    (filterSegment && filterSegment !== "all")
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Root Cause Analysis"
        description="Explain what changed in your business, how much it changed, what factors contributed, where it happened, and what to investigate next."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              className="text-xs"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${q.isFetching ? "animate-spin" : ""}`} />
              Refresh Diagnostic
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground">
                Reset Filters
              </Button>
            )}
          </div>
        }
      />

      {/* ── SECTION A: INVESTIGATION CONTROLS ──────────────────────────── */}
      <section className="surface p-4 border border-border rounded-xl">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-analytics" />
            <h2 className="text-sm font-semibold text-foreground">Investigation Scope & Controls</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Comparison Baseline: <strong className="text-foreground">Previous Equivalent Period</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Metric Selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Business Metric</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Net Revenue</SelectItem>
                <SelectItem value="order_count">Order Volume</SelectItem>
                <SelectItem value="aov">Avg Order Value (AOV)</SelectItem>
                <SelectItem value="gross_profit">Gross Profit</SelectItem>
                <SelectItem value="return_rate">Return Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Reporting Period */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Time Horizon</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Category Filter */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Product Category</label>
            <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Fashion">Fashion</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
                <SelectItem value="Home & Kitchen">Home & Kitchen</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
                <SelectItem value="Beauty & Personal Care">Beauty & Personal</SelectItem>
                <SelectItem value="Grocery">Grocery</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Channel Filter */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Sales Channel</label>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="Direct">Direct Store</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
                <SelectItem value="Flipkart">Flipkart</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Customer Segment */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Customer Segment</label>
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="High Value">High Value</SelectItem>
                <SelectItem value="Frequent">Frequent Shoppers</SelectItem>
                <SelectItem value="Occasional">Occasional Buyers</SelectItem>
                <SelectItem value="Discount Seekers">Discount Seekers</SelectItem>
                <SelectItem value="New Customers">New Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 6. Product SKU Focus */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Product SKU / ID</label>
            <Input
              placeholder="e.g. PROD0305"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value.trim())}
              className="h-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Custom date range inputs if selected */}
        {period === "custom" && (
          <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Custom Date Limits:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="Start Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="End Date"
            />
          </div>
        )}
      </section>

      {/* Main Content Query Loader */}
      <QueryState q={q}>{(d: RcaData) => {
        if (!d) return null;

        const summary = d.summary;
        const controls = d.controls;
        const factorCards = d.factor_cards || [];
        const financialImpact = d.financial_impact;
        const businessImpact = d.business_impact;
        const unusualActivity = d.unusual_activity || [];
        const timelineEvents = d.event_timeline || [];
        const nextSteps = d.next_steps || [];
        const advanced = d.advanced_analysis;

        const prevVal = summary?.previous_value ?? 0;
        const currVal = summary?.current_value ?? 0;
        const isBothZero = prevVal === 0 && currVal === 0;
        const pctChange = isBothZero ? 0 : (summary?.percent_change ?? d.problem?.change_pct ?? 0);
        const isUp = pctChange > 0;
        const isZero = pctChange === 0;
        const isReturnRate = summary?.metric_key === "return_rate";
        const isNegativeGood = isZero ? null : (isReturnRate ? !isUp : isUp);

        const formatMetricVal = (val: number) => {
          const unit = summary?.unit;
          if (unit === "currency") return fmt(val, "currency");
          if (unit === "percent") return `${val.toFixed(2)}%`;
          if (unit === "number") return `${Math.round(val).toLocaleString()} orders`;
          if (metric === "revenue" || metric === "profit" || metric === "aov") return fmt(val, "currency");
          if (metric === "return_rate") return `${val.toFixed(2)}%`;
          return `${Math.round(val).toLocaleString()} orders`;
        };

        return (
          <div className="space-y-6">

            {/* ── SECTION B: INVESTIGATION SUMMARY ────────────────────────── */}
            <section className="surface p-5 border border-border rounded-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                      {summary?.metric_label || "Business Metric"}
                    </span>
                    {summary?.investigation_scope && (
                      <span className="inline-flex items-center rounded-md border border-analytics/40 bg-analytics/10 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        Scope: {summary.investigation_scope}
                      </span>
                    )}
                    <Pill tone={isZero ? "neutral" : (isNegativeGood ? "good" : "critical")}>
                      {isZero ? "0.0% No Change" : `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}% ${isUp ? "Increase" : "Decrease"}`}
                    </Pill>
                    <span className="text-xs text-muted-foreground">
                      {summary?.period_current_label || d.problem?.period} vs {summary?.period_previous_label || "prior period"}
                    </span>
                  </div>

                  <h2 className="mt-2.5 font-display text-xl font-bold text-foreground sm:text-2xl">
                    {summary?.simple_explanation || d.problem?.title}
                  </h2>
                </div>

                {/* Scorecard delta values */}
                <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3.5 rounded-lg border border-border">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Previous Baseline</span>
                    <p className="font-display text-lg font-bold text-muted-foreground">
                      {formatMetricVal(summary?.previous_value ?? 0)}
                    </p>
                  </div>

                  <div className="text-muted-foreground">→</div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Current Period</span>
                    <p className="font-display text-lg font-bold text-foreground">
                      {formatMetricVal(summary?.current_value ?? 0)}
                    </p>
                  </div>

                  <div className="border-l border-border pl-4">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Absolute Variance</span>
                    <p className={`font-display text-lg font-bold ${isZero ? "text-muted-foreground" : (isNegativeGood ? "text-success" : "text-critical")}`}>
                      {summary?.absolute_change !== undefined
                        ? (summary.absolute_change >= 0 ? "+" : "") + formatMetricVal(summary.absolute_change)
                        : `${pctChange.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION C: WHAT MAY EXPLAIN THIS CHANGE? ─────────────────── */}
            <Panel
              title="What May Explain This Change?"
              subtitle="Ranked contributing factors evaluated across marketing, pricing, inventory, operations, and calendar patterns."
              actions={
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Info className="size-3.5" />
                        <span>Evidence Classification</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Factors are categorized by analytical certainty: Measured Contribution (deterministic accounting), Statistical Association (correlation/trend match), Model Explanation (ML SHAP attribution), or Possible Explanation (qualitative context). Correlation does not guarantee causation.
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {factorCards.map((factor) => {
                  return (
                    <article
                      key={factor.factor_id}
                      className="rounded-xl border border-border bg-card p-4 transition-all hover:border-analytics/50 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Badge Row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 rounded bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-foreground capitalize">
                            {factor.category}
                          </span>
                          <span className={`text-[11px] font-semibold ${factor.classification_color}`}>
                            {factor.classification_label}
                          </span>
                        </div>

                        {/* Title & Observed Change */}
                        <h3 className="font-display text-sm font-bold text-foreground">
                          {factor.title}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-foreground">
                          {factor.observed_change}
                        </p>

                        {/* Empirical Evidence */}
                        <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/50">
                          <span className="font-semibold text-foreground block mb-0.5">Observed Proof:</span>
                          {factor.evidence}
                        </div>
                      </div>

                      {/* Footer explanation */}
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">{factor.metric_impact_type || "Relative Factor Importance"}:</span>
                          {factor.scope_note && (
                            <span className="text-[10px] rounded bg-muted/80 px-1.5 py-0.5 text-muted-foreground font-medium">
                              {factor.scope_note}
                            </span>
                          )}
                        </div>
                        <span className="font-display font-bold text-analytics">
                          {factor.contribution_pct}%
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                <HelpCircle className="size-3.5 shrink-0" />
                Analytical note: Factors display empirical evidence and statistical relationships. Statistical associations or model SHAP rankings are not declared as confirmed causes without controlled verification.
              </p>
            </Panel>

            {/* ── SECTION D: FINANCIAL IMPACT BREAKDOWN ─────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                title={financialImpact?.title || "Financial Impact Breakdown"}
                subtitle={financialImpact?.subtitle || "Accounting for the variance between baseline and current periods"}
              >
                {financialImpact?.is_additive_waterfall ? (
                  <div>
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart data={financialImpact.steps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" {...axisProps} interval={0} fontSize={10} />
                        <YAxis {...axisProps} width={70} tickFormatter={(v) => fmt(v, "currency")} />
                        <Tooltip content={<ChartTooltip unit="currency" />} />
                        <Bar dataKey="value" name="Value" radius={4}>
                          {financialImpact.steps.map((w) => {
                            let fill = "var(--color-chart-1)";
                            if (w.is_subtotal) fill = "#3b82f6";
                            else if (w.is_residual) fill = "#8b5cf6";
                            else if (w.value < 0) fill = "var(--color-critical)";
                            else fill = "var(--color-success)";
                            return <Cell key={w.name} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Reconciliation verified note */}
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-success shrink-0" />
                        <span>{financialImpact.reconciliation_note}</span>
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        Residual: {financialImpact.unexplained_residual >= 0 ? "+" : "-"}₹{Math.abs(financialImpact.unexplained_residual).toLocaleString()}{" "}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          ({financialImpact.total_change !== 0 ? Math.round((Math.abs(financialImpact.unexplained_residual) / Math.abs(financialImpact.total_change)) * 100) : 0}% of variance)
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ratio-based metrics ({summary?.metric_label}) are compared across relative factor weights rather than additive currency bridges.
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart layout="vertical" data={financialImpact?.steps || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" {...axisProps} unit="%" />
                        <YAxis dataKey="name" type="category" {...axisProps} width={130} fontSize={11} />
                        <Tooltip content={<ChartTooltip unit="percent" />} />
                        <Bar dataKey="value" name="Factor Weight" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              {/* ── SECTION F: UNUSUAL BUSINESS ACTIVITY ──────────────────── */}
              <Panel
                title="Unusual Business Activity (Anomaly Detection)"
                subtitle="Daily performance benchmarked against weekday-matched rolling medians using MAD"
                actions={
                  selectedAnomalyDay && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAnomalyDay(null)}
                      className="text-xs text-muted-foreground"
                    >
                      Clear Inspection
                    </Button>
                  )
                }
              >
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart
                    data={unusualActivity.map((a) => ({ ...a, flag: a.is_anomaly ? a.actual : null }))}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        setSelectedAnomalyDay(e.activePayload[0].payload as RcaDailyAnomaly);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                    <YAxis {...axisProps} width={65} tickFormatter={(v) => summary?.unit === "currency" ? fmt(v, "currency") : `${v}`} />
                    <Tooltip content={<ChartTooltip unit={summary?.unit || "currency"} />} />
                    <Line dataKey="expected" name="Expected Baseline" stroke="var(--color-muted-foreground)" strokeDasharray="4 4" dot={false} />
                    <Line dataKey="actual" name="Actual Performance" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                    <Scatter dataKey="flag" name="Unusual Anomaly" fill="var(--color-critical)" />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Day Inspection Banner */}
                {selectedAnomalyDay ? (
                  <div className="mt-3 rounded-lg border border-critical/30 bg-critical-soft/30 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Inspecting Date: {selectedAnomalyDay.date} ({selectedAnomalyDay.day_name})
                      </span>
                      <Pill tone={selectedAnomalyDay.severity === "critical" ? "critical" : "warning"}>
                        {selectedAnomalyDay.severity.toUpperCase()} ANOMALY
                      </Pill>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-background/80 p-1.5 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Actual</span>
                        <span className="font-bold">{formatMetricVal(selectedAnomalyDay.actual)}</span>
                      </div>
                      <div className="rounded bg-background/80 p-1.5 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Expected</span>
                        <span className="font-bold">{formatMetricVal(selectedAnomalyDay.expected)}</span>
                      </div>
                      <div className="rounded bg-background/80 p-1.5 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Deviation</span>
                        <span className={`font-bold ${selectedAnomalyDay.deviation_pct >= 0 ? "text-success" : "text-critical"}`}>
                          {selectedAnomalyDay.deviation_pct >= 0 ? "+" : ""}{selectedAnomalyDay.deviation_pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground text-center">
                    Red scatter points indicate statistical anomalies (Median Absolute Deviation |Z| ≥ 2.0). Click any point to inspect day details.
                  </p>
                )}
              </Panel>
            </div>

            {/* ── SECTION E: BUSINESS IMPACT BREAKDOWN ─────────────────────── */}
            <Panel
              title="Where Did the Change Occur?"
              subtitle="Inspect variance by Product SKU, Category, Sales Channel, and Customer Segment"
            >
              <Tabs value={breakdownTab} onValueChange={(v) => setBreakdownTab(v as typeof breakdownTab)}>
                <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="products">Products & SKUs</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="channels">Sales Channels</TabsTrigger>
                    <TabsTrigger value="segments">Customer Segments</TabsTrigger>
                  </TabsList>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Click any product or category to filter diagnostic
                  </span>
                </div>

                {/* Tab 1: Products */}
                <TabsContent value="products">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left font-semibold text-muted-foreground">
                          <th className="py-2.5 pr-4">Product Name & SKU</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Stock Status</th>
                          <th className="py-2.5 px-3 text-right">Previous</th>
                          <th className="py-2.5 px-3 text-right">Current</th>
                          <th className="py-2.5 px-3 text-right">Change</th>
                          <th className="py-2.5 pl-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(businessImpact?.by_product || []).map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="font-semibold text-foreground block">{item.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{item.id}</span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">{item.secondary_info}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${
                                item.status === "Out of Stock"
                                  ? "bg-critical-soft text-critical"
                                  : item.status === "Low Stock"
                                  ? "bg-warning-soft text-warning"
                                  : "bg-success-soft text-success"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              {formatMetricVal(item.previous_val)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                              {formatMetricVal(item.current_val)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span className={item.pct_change >= 0 ? "text-success" : "text-critical"}>
                                {item.pct_change >= 0 ? "+" : ""}{item.pct_change.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilterProduct(item.id)}
                                className="h-7 text-[11px] px-2"
                              >
                                Filter RCA
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* Tab 2: Categories */}
                <TabsContent value="categories">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart layout="vertical" data={businessImpact?.by_category || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" {...axisProps} tickFormatter={(v) => fmt(v, "currency")} />
                        <YAxis dataKey="name" type="category" {...axisProps} width={110} fontSize={11} />
                        <Tooltip content={<ChartTooltip unit="currency" />} />
                        <Bar dataKey="current_val" name="Current Revenue" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                      {(businessImpact?.by_category || []).map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20 text-xs">
                          <div>
                            <span className="font-semibold text-foreground">{cat.name}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              Share: {cat.share_pct}% of total
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground block">{formatMetricVal(cat.current_val)}</span>
                            <span className={`text-[11px] font-semibold ${cat.pct_change >= 0 ? "text-success" : "text-critical"}`}>
                              {cat.pct_change >= 0 ? "+" : ""}{cat.pct_change.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Channels */}
                <TabsContent value="channels">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(businessImpact?.by_channel || []).map((ch) => (
                      <div key={ch.id} className="p-3.5 rounded-lg border border-border bg-card">
                        <span className="text-xs font-semibold text-foreground">{ch.name}</span>
                        <p className="mt-1 font-display text-base font-bold text-foreground">
                          {formatMetricVal(ch.current_val)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{ch.share_pct}% share</span>
                          <span className={`font-semibold ${ch.pct_change >= 0 ? "text-success" : "text-critical"}`}>
                            {ch.pct_change >= 0 ? "+" : ""}{ch.pct_change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 4: Segments */}
                <TabsContent value="segments">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(businessImpact?.by_segment || []).map((seg) => (
                      <div key={seg.id} className="p-3.5 rounded-lg border border-border bg-card">
                        <span className="text-xs font-semibold text-foreground">{seg.name}</span>
                        <p className="mt-1 font-display text-base font-bold text-foreground">
                          {formatMetricVal(seg.current_val)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{seg.share_pct}% share</span>
                          <span className={`font-semibold ${seg.pct_change >= 0 ? "text-success" : "text-critical"}`}>
                            {seg.pct_change >= 0 ? "+" : ""}{seg.pct_change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Panel>

            {/* ── SECTION G: RELATED EVENT TIMELINE ───────────────────────── */}
            <Panel
              title="Related Event Timeline"
              subtitle="Verified commercial events recorded across promotions, marketing, competitor pricing, and warehouse logs"
            >
              {timelineEvents.length > 0 ? (
                <div className="space-y-3">
                  {timelineEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="mt-0.5 rounded-lg bg-muted p-2 text-foreground shrink-0">
                        {event.event_type === "promotion" && <Calendar className="size-4 text-purple-500" />}
                        {event.event_type === "marketing" && <Zap className="size-4 text-blue-500" />}
                        {event.event_type === "competitor" && <TrendingDown className="size-4 text-amber-500" />}
                        {event.event_type === "inventory" && <Package className="size-4 text-critical" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground text-xs">{event.title}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{event.date}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                        {event.affected_entity && (
                          <span className="inline-block mt-1.5 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                            Target: {event.affected_entity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground italic">
                    Note: Events reflect verified enterprise database logs during this period. Temporal alignment with metric changes does not assume direct causation.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No verified external promotional or competitor shock events logged during this specific time window.
                </p>
              )}
            </Panel>

            {/* ── SECTION H: RECOMMENDED INVESTIGATION & NEXT STEPS ────────── */}
            <Panel
              title="Recommended Investigation & Next Steps"
              subtitle="Prioritized, evidence-backed actions linking directly to decision modules"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {nextSteps.map((step) => (
                  <div
                    key={step.step_number}
                    className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-analytics transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-analytics text-white text-xs font-bold">
                          {step.step_number}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground uppercase">
                          {step.action_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-foreground">{step.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        className="w-full text-xs flex items-center justify-between"
                      >
                        <Link to={step.link_path}>
                          <span>Open in {step.link_module}</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* ── SECTION I: ADVANCED ANALYSIS (COLLAPSED BY DEFAULT) ──────── */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced-ml" className="border border-border rounded-xl bg-card px-4">
                <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-500" />
                    <span>Advanced Machine Learning & SHAP Explainability (Technical Details)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 text-xs space-y-5">
                  {/* Model Benchmarking */}
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">Model Validation & Benchmarks</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left font-semibold text-muted-foreground">
                            <th className="py-2 pr-3">Model</th>
                            <th className="py-2 px-3">R² Fit</th>
                            <th className="py-2 px-3">MAE (INR)</th>
                            <th className="py-2 px-3">RMSE (INR)</th>
                            <th className="py-2 px-3">Rel Error</th>
                            <th className="py-2 pl-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(advanced?.model_benchmarks || []).map((bm) => (
                            <tr key={bm.model_name}>
                              <td className="py-2 pr-3 font-medium text-foreground">{bm.model_name}</td>
                              <td className="py-2 px-3 font-mono">{bm.r2_score.toFixed(3)}</td>
                              <td className="py-2 px-3">₹{bm.mae.toLocaleString()}</td>
                              <td className="py-2 px-3">₹{bm.rmse.toLocaleString()}</td>
                              <td className="py-2 px-3">{bm.relative_error_pct}%</td>
                              <td className="py-2 pl-3">
                                <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${
                                  bm.benchmark_status === "Best Among Tested Models"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {bm.benchmark_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SHAP Feature Weights */}
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">
                      TreeSHAP Explainability Attributions (Human-Readable Feature Translations)
                    </h5>
                    <div className="space-y-2">
                      {(advanced?.shap_features || []).map((feat) => {
                        const maxShap = Math.max(...(advanced?.shap_features.map((x) => x.mean_abs_shap) || [1]));
                        return (
                          <div key={feat.feature} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-foreground">{feat.business_meaning || feat.feature}</span>
                              <span className="font-mono text-muted-foreground">
                                SHAP: ₹{feat.mean_abs_shap.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-purple-500"
                                style={{ width: `${(feat.mean_abs_shap / maxShap) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Methodology Note */}
                  <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground border border-border">
                    <span className="font-semibold text-foreground block mb-0.5">Methodology:</span>
                    {advanced?.methodology_notes || "Models evaluated on historical dataset using time-series chronological validation."} Samples: {advanced?.training_sample_count || 365} daily records.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

          </div>
        );
      }}</QueryState>
    </div>
  );
}
