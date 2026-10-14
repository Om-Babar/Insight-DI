import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  RefreshCw,
  Search,
  SlidersHorizontal,
  Info,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  ShoppingCart,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { fmt, shortDate, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartTooltip,
  Freshness,
  PageHeader,
  Panel,
  Pill,
  QueryState,
  SeverityIcon,
  axisProps,
} from "@/components/app/primitives";
import type { CompetitorProduct } from "@/lib/types";

export const Route = createFileRoute("/competition")({
  head: () => ({
    meta: [
      { title: "Competitive Intelligence — InsightDI" },
      {
        name: "description",
        content:
          "Benchmark your pricing, discounts, stock availability and ratings against Amazon.in and Flipkart.",
      },
      { property: "og:title", content: "Competitive Intelligence — InsightDI" },
      {
        property: "og:description",
        content:
          "Benchmark your pricing, discounts, stock availability and ratings against Amazon.in and Flipkart.",
      },
    ],
  }),
  component: Competition,
});

function Competition() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["competition"], queryFn: api.competition });
  const [sku, setSku] = useState<string | null>(null);

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "gap" | "rating">("gap");
  const [sortAsc, setSortAsc] = useState(false);

  const refresh = useMutation({
    mutationFn: api.refreshCompetition,
    onSuccess: (res: any) => {
      const msg = res?.message || "Marketplace collection triggered";
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["competition"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Competitive Intelligence"
        description="Monitor competitor pricing, stock availability, and ratings on Amazon.in and Flipkart to identify market risks and demand opportunities."
        actions={
          <Button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={refresh.isPending ? "size-4 animate-spin" : "size-4"}
            />
            {refresh.isPending ? "Refreshing prices..." : "Refresh prices"}
          </Button>
        }
      />

      <QueryState q={q} empty={(d) => !d.products?.length}>
        {(d) => {
          const products = d.products || [];
          const categories = Array.from(
            new Set(products.map((p) => p.category).filter(Boolean))
          ) as string[];

          // Filter & Sort logic
          const filtered = products.filter((p) => {
            if (
              search &&
              !p.name.toLowerCase().includes(search.toLowerCase()) &&
              !p.sku.toLowerCase().includes(search.toLowerCase())
            ) {
              return false;
            }
            if (categoryFilter !== "all" && p.category !== categoryFilter) {
              return false;
            }
            if (positionFilter !== "all" && p.position !== positionFilter) {
              return false;
            }
            return true;
          });

          const sorted = [...filtered].sort((a, b) => {
            let res = 0;
            if (sortBy === "name") {
              res = a.name.localeCompare(b.name);
            } else if (sortBy === "price") {
              res = a.our_price - b.our_price;
            } else if (sortBy === "gap") {
              const gapA = a.price_gap_vs_lowest_pct ?? 0;
              const gapB = b.price_gap_vs_lowest_pct ?? 0;
              res = gapA - gapB;
            } else if (sortBy === "rating") {
              res = a.our_rating - b.our_rating;
            }
            return sortAsc ? res : -res;
          });

          const sel =
            products.find((p) => p.sku === sku) ??
            sorted[0] ??
            products[0]!;

          // Overview KPI metrics from backend or calculated fallback
          const overview = d.overview ?? {
            products_monitored: products.length,
            price_alerts_count: d.alerts?.length ?? 0,
            products_priced_above_count: products.filter(
              (p) => p.position === "overpriced"
            ).length,
            competitor_availability_changes_count: products.filter((p) =>
              p.listings?.some((l) => l.availability === "out_of_stock")
            ).length,
            cheapest_count: products.filter((p) => p.position === "cheapest")
              .length,
            competitive_count: products.filter(
              (p) => p.position === "competitive"
            ).length,
          };

          return (
            <div className="space-y-6">
              {/* ────────────────────────────────────────────────────────
                  SECTION A: COMPETITIVE OVERVIEW (4 KEY METRICS)
                 ──────────────────────────────────────────────────────── */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Competitive Overview
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Authoritative warehouse data · Last checked {d.last_collected}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Metric 1: Products Monitored */}
                  <div className="surface p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Products Monitored
                        </p>
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-help text-muted-foreground/70 hover:text-foreground"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Total active internal catalog products mapped to competitor marketplace offers.
                            </TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      </div>
                      <Package className="size-4 text-analytics" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="tabular text-2xl font-bold tracking-tight text-foreground">
                        {fmt(overview.products_monitored, "number")}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        100% catalog coverage
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tracked across Amazon.in & Flipkart
                    </p>
                  </div>

                  {/* Metric 2: Price Alerts */}
                  <div className="surface p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Price Alerts
                        </p>
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-help text-muted-foreground/70 hover:text-foreground"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Active alerts flagging significant competitor price cuts (&gt;5%) or competitor stockout demand opportunities.
                            </TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      </div>
                      <AlertTriangle className="size-4 text-warning" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="tabular text-2xl font-bold tracking-tight text-warning">
                        {fmt(overview.price_alerts_count, "number")}
                      </p>
                      <Pill tone="warning">Action Needed</Pill>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      High-impact market shifts detected
                    </p>
                  </div>

                  {/* Metric 3: Products Priced Above Competitors */}
                  <div className="surface p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Priced Above Market
                        </p>
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-help text-muted-foreground/70 hover:text-foreground"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Products where your price is &gt;3% higher than the lowest active in-stock competitor listing.
                            </TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      </div>
                      <ArrowUpRight className="size-4 text-critical" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="tabular text-2xl font-bold tracking-tight text-critical">
                        {fmt(overview.products_priced_above_count, "number")}
                      </p>
                      <span className="text-xs text-critical font-medium">
                        {roundPct(
                          overview.products_priced_above_count,
                          overview.products_monitored
                        )}% of catalog
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Competitors offer lower in-stock prices
                    </p>
                  </div>

                  {/* Metric 4: Competitor Availability Changes */}
                  <div className="surface p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Stockout Opportunities
                        </p>
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-help text-muted-foreground/70 hover:text-foreground"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Monitored competitor products that are currently out of stock. Immediate window to capture diverted customer demand.
                            </TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      </div>
                      <CheckCircle2 className="size-4 text-success" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="tabular text-2xl font-bold tracking-tight text-success">
                        {fmt(overview.competitor_availability_changes_count, "number")}
                      </p>
                      <Pill tone="good">Demand Window</Pill>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Competitors out of stock on your SKUs
                    </p>
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────
                  SECTION B: MARKETPLACE STATUS CARDS
                 ──────────────────────────────────────────────────────── */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Marketplace Status &amp; Data Pipeline
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {d.sources?.map((s) => {
                    const isFresh = s.status === "fresh";
                    const isFailed = s.status === "failed";
                    const isUnconfigured = s.status === "unconfigured" || s.status === "not_synced";
                    const isLastKnown = s.status === "last_known_data" || s.status === "configured" || s.status === "stale";

                    return (
                      <div
                        key={s.platform}
                        className="surface flex flex-col justify-between p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="size-4 text-primary" />
                              <h3 className="font-semibold text-foreground">
                                {s.platform}
                              </h3>
                            </div>
                            <Pill
                              tone={
                                isFresh
                                  ? "good"
                                  : isFailed
                                  ? "critical"
                                  : isUnconfigured
                                  ? "neutral"
                                  : "warning"
                              }
                            >
                              {isFresh
                                ? "LIVE SYNCED"
                                : isFailed
                                ? "COLLECTION FAILED"
                                : isUnconfigured
                                ? "NOT SYNCED"
                                : "LAST KNOWN DATA"}
                            </Pill>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            {s.message ||
                              "Verified product listings matched to internal catalog."}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            Last successful collection:{" "}
                            <span className="font-medium text-foreground">
                              {timeAgo(s.last_collected)} ({s.last_collected})
                            </span>
                          </span>
                          <span className="font-medium text-foreground">
                            {s.products} valid products {isFresh ? "collected" : "checked"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────
                  SECTION C: IMPORTANT MARKET CHANGES (ALERTS)
                 ──────────────────────────────────────────────────────── */}
              {d.alerts && d.alerts.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Important Market Changes
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {d.alerts.length} actionable {d.alerts.length === 1 ? "alert" : "alerts"} based on latest market observations
                    </span>
                  </div>
                  <div className="space-y-3">
                    {d.alerts.map((a) => (
                      <div
                        key={a.id}
                        className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <SeverityIcon severity={a.severity} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {a.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.detail}
                            </p>
                            {a.recommended_action && (
                              <p className="mt-1 text-xs font-medium text-primary">
                                Recommended Action: {a.recommended_action}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 border-t border-border pt-2 sm:border-0 sm:pt-0">
                          {a.latest_price !== undefined && a.latest_price !== null && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Observed Price</p>
                              <p className="tabular text-sm font-bold text-foreground">
                                {fmt(a.latest_price, "currency", false)}
                              </p>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(a.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  SECTION D: PRODUCT PRICE COMPARISON TABLE
                 ──────────────────────────────────────────────────────── */}
              <Panel
                title="Product Price Comparison"
                subtitle={`Showing ${sorted.length} of ${products.length} products currently loaded (${overview.products_monitored} monitored in catalog). Select any product to inspect its historical price chart.`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Position Filter Buttons */}
                    <div className="flex rounded-md border border-border bg-muted p-0.5 text-xs">
                      {[
                        { label: "All", val: "all" },
                        { label: "Priced Above", val: "overpriced" },
                        { label: "Competitive", val: "competitive" },
                        { label: "Cheapest", val: "cheapest" },
                      ].map((tab) => (
                        <button
                          key={tab.val}
                          type="button"
                          onClick={() => setPositionFilter(tab.val)}
                          className={`rounded px-2.5 py-1 font-medium transition-colors ${
                            positionFilter === tab.val
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              >
                {/* Search & Secondary Filter Bar */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search product name or SKU..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {categories.length > 0 && (
                      <select
                        aria-label="Filter by category"
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">All Categories ({categories.length})</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      aria-label="Sort products"
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="gap">Sort: Price Gap</option>
                      <option value="price">Sort: Your Price</option>
                      <option value="name">Sort: Product Name</option>
                      <option value="rating">Sort: Rating</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setSortAsc(!sortAsc)}
                      title={sortAsc ? "Ascending order" : "Descending order"}
                    >
                      {sortAsc ? "↑ Asc" : "↓ Desc"}
                    </Button>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pl-2">Product</th>
                        <th>Your Price</th>
                        <th>Amazon.in</th>
                        <th>Flipkart</th>
                        <th>Price Difference</th>
                        <th>Availability</th>
                        <th>Rating</th>
                        <th>Last Checked</th>
                        <th>Position</th>
                        <th className="pr-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-muted-foreground">
                            No products match your current search and filter criteria.
                          </td>
                        </tr>
                      ) : (
                        sorted.map((p) => {
                          const a = p.listings.find((l) => l.platform === "amazon");
                          const f = p.listings.find((l) => l.platform === "flipkart");
                          const gapPct = p.price_gap_vs_lowest_pct;
                          const isSelected = sel.sku === p.sku;

                          return (
                            <tr
                              key={p.sku}
                              onClick={() => setSku(p.sku)}
                              className={`tabular cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted ${
                                isSelected ? "bg-analytics-soft/60" : ""
                              }`}
                            >
                              <td className="py-3 pl-2 font-medium text-foreground">
                                <div>
                                  <p className="font-semibold">{p.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {p.sku} {p.category ? `· ${p.category}` : ""}
                                  </p>
                                </div>
                              </td>
                              <td className="font-semibold text-foreground">
                                {fmt(p.our_price, "currency", false)}
                              </td>
                              <td>
                                {a?.price != null ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-foreground">{fmt(a.price, "currency", false)}</p>
                                      <span
                                        className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${
                                          a.status === "fresh"
                                            ? "bg-success/15 text-success"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                        title={a.status === "fresh" ? "Current live price" : `Last-known price (${a.collected_at})`}
                                      >
                                        {a.status === "fresh" ? "Live" : "Last-known"}
                                      </span>
                                    </div>
                                    {a.discount_pct ? (
                                      <span className="text-[10px] text-success font-medium">
                                        {a.discount_pct}% off
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td>
                                {f?.price != null ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-foreground">{fmt(f.price, "currency", false)}</p>
                                      <span
                                        className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${
                                          f.status === "fresh"
                                            ? "bg-success/15 text-success"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                        title={f.status === "fresh" ? "Current live price" : `Last-known price (${f.collected_at})`}
                                      >
                                        {f.status === "fresh" ? "Live" : "Last-known"}
                                      </span>
                                    </div>
                                    {f.discount_pct ? (
                                      <span className="text-[10px] text-success font-medium">
                                        {f.discount_pct}% off
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td>
                                {(() => {
                                  // Find valid in-stock competitor offers
                                  const inStockListings = p.listings?.filter(
                                    (l) => l.price != null && l.price > 0 && l.availability !== "out_of_stock"
                                  ) || [];

                                  const lowestCompPrice = p.lowest_competitor_price ?? (
                                    inStockListings.length > 0
                                      ? Math.min(...inStockListings.map((l) => l.price!))
                                      : null
                                  );

                                  const gapAbs = p.price_gap_vs_lowest_abs ?? (
                                    lowestCompPrice != null
                                      ? Number((p.our_price - lowestCompPrice).toFixed(2))
                                      : null
                                  );

                                  const effectiveGapPct = p.price_gap_vs_lowest_pct ?? (
                                    lowestCompPrice != null && lowestCompPrice > 0
                                      ? Number((((p.our_price - lowestCompPrice) / lowestCompPrice) * 100).toFixed(1))
                                      : null
                                  );

                                  if (effectiveGapPct != null && gapAbs != null) {
                                    return (
                                      <div>
                                        <span
                                          className={`inline-flex items-center gap-0.5 font-semibold ${
                                            effectiveGapPct > 3
                                              ? "text-critical"
                                              : effectiveGapPct < -3
                                              ? "text-success"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {gapAbs > 0
                                            ? `+${fmt(gapAbs, "currency", false)}`
                                            : gapAbs < 0
                                            ? `-${fmt(Math.abs(gapAbs), "currency", false)}`
                                            : "₹0"}
                                          {effectiveGapPct > 3 ? (
                                            <ArrowUpRight className="size-3" />
                                          ) : effectiveGapPct < -3 ? (
                                            <ArrowDownRight className="size-3" />
                                          ) : null}
                                        </span>
                                        <p
                                          className={`text-[11px] font-medium ${
                                            effectiveGapPct > 3
                                              ? "text-critical/90"
                                              : effectiveGapPct < -3
                                              ? "text-success/90"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {effectiveGapPct > 0 ? `+${effectiveGapPct}%` : `${effectiveGapPct}%`}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <span
                                      className="text-muted-foreground"
                                      title="No purchasable in-stock competitor offer available"
                                    >
                                      —
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <span className="w-8 text-[10px] font-semibold uppercase text-muted-foreground">Amz:</span>
                                    {a ? (
                                      <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          a.availability === "out_of_stock"
                                            ? "bg-warning/15 text-warning"
                                            : a.availability === "low_stock"
                                            ? "bg-warning/10 text-warning"
                                            : "bg-success/15 text-success"
                                        }`}
                                      >
                                        {a.availability === "out_of_stock"
                                          ? "Out of Stock"
                                          : a.availability === "low_stock"
                                          ? "Low Stock"
                                          : "In Stock"}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <span className="w-8 text-[10px] font-semibold uppercase text-muted-foreground">Fkp:</span>
                                    {f ? (
                                      <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          f.availability === "out_of_stock"
                                            ? "bg-warning/15 text-warning"
                                            : f.availability === "low_stock"
                                            ? "bg-warning/10 text-warning"
                                            : "bg-success/15 text-success"
                                        }`}
                                      >
                                        {f.availability === "out_of_stock"
                                          ? "Out of Stock"
                                          : f.availability === "low_stock"
                                          ? "Low Stock"
                                          : "In Stock"}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="font-medium text-foreground">
                                  {p.our_rating.toFixed(1)}★
                                </span>
                              </td>
                              <td className="text-xs text-muted-foreground">
                                <div>
                                  <p className="font-medium text-foreground">{p.last_checked || shortDate(d.last_collected)}</p>
                                  <span
                                    className={`inline-block text-[10px] font-medium ${
                                      p.listings?.some((l) => l.status === "fresh")
                                        ? "text-success"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {p.listings?.some((l) => l.status === "fresh") ? "● Live Verified" : "Last-known observation"}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <Pill
                                  tone={
                                    p.position === "cheapest"
                                      ? "good"
                                      : p.position === "competitive"
                                      ? "info"
                                      : "critical"
                                  }
                                >
                                  {p.position === "cheapest"
                                    ? "Cheapest"
                                    : p.position === "competitive"
                                    ? "Competitive"
                                    : "Priced Above"}
                                </Pill>
                              </td>
                              <td className="pr-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSku(p.sku);
                                  }}
                                >
                                  {isSelected ? "Viewing" : "History"}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* ────────────────────────────────────────────────────────
                  SECTION E: PRICE HISTORY CHART
                 ──────────────────────────────────────────────────────── */}
              <Panel
                title={`Price History — ${sel.name} (${sel.sku})`}
                subtitle="Historical price trajectory comparison: Your selling price vs Amazon.in and Flipkart observations over time."
                actions={
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Current: <strong className="text-foreground">{fmt(sel.our_price, "currency", false)}</strong>
                    </span>
                    <Pill
                      tone={
                        sel.position === "cheapest"
                          ? "good"
                          : sel.position === "competitive"
                          ? "info"
                          : "critical"
                      }
                    >
                      {sel.position === "cheapest"
                        ? "Cheapest in market"
                        : sel.position === "competitive"
                        ? "Competitive parity"
                        : "Priced above market"}
                    </Pill>
                  </div>
                }
              >
                {sel.price_history && sel.price_history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={sel.price_history}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        {...axisProps}
                      />
                      <YAxis
                        {...axisProps}
                        width={70}
                        tickFormatter={(v) => fmt(v, "currency")}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip content={<ChartTooltip unit="currency" />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="ours"
                        name="Your Price"
                        stroke="var(--color-chart-1)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="amazon"
                        name="Amazon.in"
                        stroke="var(--color-chart-3)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="flipkart"
                        name="Flipkart"
                        stroke="var(--color-chart-2)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    No historical observations recorded for this item yet.
                  </div>
                )}
              </Panel>

              {/* ────────────────────────────────────────────────────────
                  SECTION F: EVIDENCE-BASED COMPETITIVE INSIGHTS & ACTIONS
                 ──────────────────────────────────────────────────────── */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-4 text-ai" />
                    Competitive Insights &amp; Recommended Actions
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Actionable advice based on observed market gaps
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(d.insights && d.insights.length > 0
                    ? d.insights
                    : defaultInsights(overview)
                  ).map((ins) => (
                    <div key={ins.id} className="surface flex flex-col justify-between p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          <h3 className="font-semibold text-foreground text-sm">
                            {ins.title}
                          </h3>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          {ins.description}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Recommended Next Step
                        </p>
                        <p className="mt-1 text-xs text-foreground font-medium">
                          {ins.suggested_action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

function roundPct(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function defaultInsights(overview: any) {
  return [
    {
      id: "def-1",
      title: `${overview.products_priced_above_count} ${overview.products_priced_above_count === 1 ? "product" : "products"} priced above market`,
      description: `Approximately ${roundPct(
        overview.products_priced_above_count,
        overview.products_monitored
      )}% of your monitored catalog is priced higher than the lowest observed competitor offer.`,
      category: "pricing_pressure",
      impact: "May impact conversion on price-sensitive consumer categories.",
      suggested_action:
        "Evaluate gross margins and consider promotional adjustments on high-traffic SKUs.",
    },
    {
      id: "def-2",
      title: `${overview.competitor_availability_changes_count} competitor ${overview.competitor_availability_changes_count === 1 ? "stockout detected" : "stockouts detected"}`,
      description:
        `Competitors are currently out of stock on ${overview.competitor_availability_changes_count} catalog ${overview.competitor_availability_changes_count === 1 ? "item" : "items"}, creating an immediate opportunity to capture diverted customer demand.`,
      category: "demand_capture",
      impact: "Higher organic conversion potential while competitor stock remains zero.",
      suggested_action:
        "Highlight in-stock badges and increase ad exposure for these items to capture market share.",
    },
    {
      id: "def-3",
      title: `${overview.cheapest_count} ${overview.cheapest_count === 1 ? "product holds" : "products hold"} price advantage`,
      description:
        `Your catalog maintains the most competitive price across ${overview.cheapest_count} ${overview.cheapest_count === 1 ? "item" : "items"} with healthy ratings.`,
      category: "price_leadership",
      impact: "Strong organic pull and natural customer preference.",
      suggested_action:
        "Protect inventory availability and maintain price stability to maximize sales volume.",
    },
  ];
}

