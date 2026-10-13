import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  Megaphone,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import type { AnalyticsSection, Kpi } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartTooltip,
  EmptyState,
  KpiGrid,
  PageHeader,
  Panel,
  Pill,
  QueryState,
  axisProps,
} from "@/components/app/primitives";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Business Analytics — InsightDI" },
      { name: "description", content: "Explore sales, product performance, customer segments, inventory health, and marketing efficiency across your enterprise." },
      { property: "og:title", content: "Business Analytics — InsightDI" },
      { property: "og:description", content: "Explore sales, product performance, customer segments, inventory health, and marketing efficiency across your enterprise." },
    ],
  }),
  component: Analytics,
});

const sections: { v: AnalyticsSection; l: string }[] = [
  { v: "sales", l: "Sales" },
  { v: "products", l: "Products" },
  { v: "customers", l: "Customers" },
  { v: "inventory", l: "Inventory" },
  { v: "marketing", l: "Marketing" },
];

const colors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

// Master products catalog with comprehensive SKU attributes
interface ProductCatalogItem {
  sku: string;
  name: string;
  category: string;
  revenue: number;
  units: number;
  margin_pct: number;
  change_pct: number;
  stock: number;
  cost_price: number;
  selling_price: number;
}

const masterProductsCatalog: ProductCatalogItem[] = [
  { sku: "EB-PRO", name: "Wireless Earbuds Pro", category: "Audio", revenue: 612000, units: 2040, margin_pct: 28, change_pct: 19, stock: 380, cost_price: 1799, selling_price: 2499 },
  { sku: "BS-MINI", name: "Bluetooth Speaker Mini", category: "Audio", revenue: 401000, units: 1610, margin_pct: 31, change_pct: 14, stock: 520, cost_price: 1249, selling_price: 1799 },
  { sku: "HP-ANC", name: "Over-Ear ANC Headphones", category: "Audio", revenue: 167000, units: 334, margin_pct: 34, change_pct: 8.5, stock: 140, cost_price: 3299, selling_price: 4999 },
  { sku: "SW-X2", name: "Smart Watch X2", category: "Wearables", revenue: 356000, units: 89, margin_pct: 17, change_pct: -12, stock: 210, cost_price: 3319, selling_price: 3999 },
  { sku: "FB-PRO", name: "Fitness Band Pulse", category: "Wearables", revenue: 244000, units: 976, margin_pct: 26, change_pct: 11, stock: 340, cost_price: 1849, selling_price: 2499 },
  { sku: "SW-STR", name: "Silicone Replacement Straps", category: "Wearables", revenue: 120000, units: 2400, margin_pct: 45, change_pct: 6.2, stock: 850, cost_price: 274, selling_price: 499 },
  { sku: "PD-65W", name: "Fast Wall Charger 65W", category: "Accessories", revenue: 322000, units: 1610, margin_pct: 38, change_pct: 18, stock: 450, cost_price: 1239, selling_price: 1999 },
  { sku: "USB-HUB", name: "USB-C Hub 7-in-1", category: "Accessories", revenue: 38000, units: 345, margin_pct: 22, change_pct: -24, stock: 1640, cost_price: 779, selling_price: 999 },
  { sku: "CBL-3M", name: "Braided Cable 3m", category: "Accessories", revenue: 29000, units: 970, margin_pct: 40, change_pct: -9, stock: 920, cost_price: 179, selling_price: 299 },
  { sku: "STD-LT", name: "Aluminum Laptop Stand", category: "Accessories", revenue: 21000, units: 70, margin_pct: 35, change_pct: -15, stock: 310, cost_price: 974, selling_price: 1499 },
  { sku: "PC-15", name: "Impact Phone Case 15", category: "Mobile", revenue: 184000, units: 3680, margin_pct: 42, change_pct: 15.4, stock: 210, cost_price: 289, selling_price: 499 },
  { sku: "SG-15", name: "Tempered Screen Guard 15", category: "Mobile", revenue: 120000, units: 4000, margin_pct: 55, change_pct: 22.1, stock: 150, cost_price: 89, selling_price: 199 },
];

function Analytics() {
  const [section, setSection] = useState<AnalyticsSection>("sales");

  // Shared Global Date Filter & Comparison (Preserved across all 5 tabs)
  const [range, setRange] = useState("30d");
  const [comparison, setComparison] = useState("previous_period");

  // ==========================================
  // TAB-SPECIFIC FILTERS
  // ==========================================
  // Sales Tab filters:
  const [salesChannel, setSalesChannel] = useState("all");
  const [salesCategory, setSalesCategory] = useState("all");
  const [salesChartMetric, setSalesChartMetric] = useState<"both" | "revenue" | "orders">("both");
  const [salesDrilldownCategory, setSalesDrilldownCategory] = useState<string | null>(null);

  // Products Tab filters & controls:
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productPerfFilter, setProductPerfFilter] = useState("all"); // "all" | "top" | "declining" | "low_margin"
  const [productSearch, setProductSearch] = useState("");
  const [productSortKey, setProductSortKey] = useState<"revenue" | "units" | "margin_pct" | "change_pct">("revenue");
  const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("desc");
  const [productPage, setProductPage] = useState(1);
  const [selectedProductDetail, setSelectedProductDetail] = useState<ProductCatalogItem | null>(null);

  // Customers Tab filters & controls:
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState("all");
  const [customerSegmentView, setCustomerSegmentView] = useState<"count" | "revenue">("count");
  const [customerGeoSearch, setCustomerGeoSearch] = useState("");
  const [customerGeoSortKey, setCustomerGeoSortKey] = useState<"revenue" | "customers" | "orders" | "rev_per_customer" | "growth_pct" | "city">("revenue");
  const [customerGeoSortDir, setCustomerGeoSortDir] = useState<"asc" | "desc">("desc");
  const [customerGeoPage, setCustomerGeoPage] = useState(1);
  const [customerTrendView, setCustomerTrendView] = useState<"both" | "new" | "returning">("both");

  // Inventory Tab filters & table controls:
  const [inventoryRiskFilter, setInventoryRiskFilter] = useState("all");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySortKey, setInventorySortKey] = useState<"days_of_cover" | "current_stock" | "avg_daily_demand" | "product_name">("days_of_cover");
  const [inventorySortDir, setInventorySortDir] = useState<"asc" | "desc">("asc");
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryCoverChartView, setInventoryCoverChartView] = useState<"low" | "excess">("low");

  // Marketing Tab filters & state:
  const [marketingChannelFilter, setMarketingChannelFilter] = useState("all");
  const [marketingStatusFilter, setMarketingStatusFilter] = useState<"all" | "strong" | "moderate" | "attention">("all");
  const [marketingSearch, setMarketingSearch] = useState("");
  const [marketingSortKey, setMarketingSortKey] = useState<"roas" | "spend" | "revenue" | "conversions" | "cost_per_acquisition">("roas");
  const [marketingSortDir, setMarketingSortDir] = useState<"asc" | "desc">("desc");
  const [marketingPage, setMarketingPage] = useState(1);
  const [marketingTrendMetric, setMarketingTrendMetric] = useState<"both" | "revenue" | "spend">("both");

  // Query Data
  const q = useQuery({
    queryKey: [
      "analytics",
      section,
      range,
      comparison,
      productCategoryFilter,
      customerSegmentFilter,
      marketingChannelFilter,
      marketingStatusFilter,
    ],
    queryFn: () =>
      api.analytics(section, range, {
        comparison,
        category: section === "products" && productCategoryFilter !== "all" ? productCategoryFilter : undefined,
        segment: section === "customers" && customerSegmentFilter !== "all" ? customerSegmentFilter : undefined,
        channel: section === "marketing" && marketingChannelFilter !== "all" ? marketingChannelFilter : undefined,
        status: section === "marketing" && marketingStatusFilter !== "all" ? marketingStatusFilter : undefined,
      }),
  });

  const d = q.data;

  // Real products catalog derived dynamically from backend database API, fallback to masterProductsCatalog
  const baseCatalogList = useMemo<ProductCatalogItem[]>(() => {
    if (d?.all_products && Array.isArray(d.all_products) && d.all_products.length > 0) {
      return d.all_products.map((p: any) => ({
        sku: p.product_id || p.sku,
        name: p.product_name || p.name,
        category: p.category,
        selling_price: Number(p.selling_price || 0),
        cost_price: Number(p.cost_price || 0),
        revenue: Number(p.revenue || 0),
        units: Number(p.units_sold ?? p.units ?? 0),
        margin_pct: Number(p.profit_margin_pct ?? p.margin_pct ?? 0),
        change_pct: Number(p.change_pct || 0),
        stock: Number(p.current_stock ?? p.stock ?? 0),
      }));
    }
    return masterProductsCatalog;
  }, [d?.all_products]);

  // Dynamically available categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (d?.category_breakdown && Array.isArray(d.category_breakdown) && d.category_breakdown.length > 0) {
      return d.category_breakdown.map((c: any) => c.category);
    }
    const cats = Array.from(new Set(baseCatalogList.map((p) => p.category))).filter(Boolean);
    return cats.length > 0 ? cats : ["Audio", "Wearables", "Accessories", "Mobile"];
  }, [d?.category_breakdown, baseCatalogList]);

  // Scaled and filtered products catalog
  const filteredProductsCatalog = useMemo(() => {
    let list = [...baseCatalogList];

    // Category filter
    if (productCategoryFilter !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === productCategoryFilter.toLowerCase());
    }

    // Performance filter
    if (productPerfFilter === "top") {
      list = list.filter((p) => p.change_pct >= 10);
    } else if (productPerfFilter === "declining") {
      list = list.filter((p) => p.change_pct < 0);
    } else if (productPerfFilter === "low_margin") {
      list = list.filter((p) => p.margin_pct < 25);
    }

    // Text search filter
    if (productSearch.trim()) {
      const qLower = productSearch.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(qLower) || p.sku.toLowerCase().includes(qLower));
    }

    // Multi-column sorting
    list.sort((a, b) => {
      const aVal = a[productSortKey];
      const bVal = b[productSortKey];
      return productSortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [baseCatalogList, productCategoryFilter, productPerfFilter, productSearch, productSortKey, productSortDir]);

  // Paginated catalog rows
  const itemsPerPage = 10;
  const totalCatalogPages = Math.max(1, Math.ceil(filteredProductsCatalog.length / itemsPerPage));
  const paginatedCatalogRows = useMemo(() => {
    const start = (productPage - 1) * itemsPerPage;
    return filteredProductsCatalog.slice(start, start + itemsPerPage);
  }, [filteredProductsCatalog, productPage]);

  // Products Tab Accurate KPI Calculations
  const productsKpis = useMemo(() => {
    const hasClientFilter = productPerfFilter !== "all" || productSearch.trim().length > 0;
    if (d?.kpis && Array.isArray(d.kpis) && d.kpis.length === 4 && !hasClientFilter) {
      return d.kpis.map((k: any) => ({
        key: k.key,
        label: k.label,
        value: Number(k.value),
        unit: k.unit as "currency" | "number" | "percent",
        change_pct: Number(k.change_pct || 0),
        status: k.status as "good" | "warning" | "critical",
        is_pp: Boolean(k.is_pp),
        comparison_label: k.comparison_label || (comparison === "previous_year" ? "vs last year" : "vs last period"),
        hint: k.hint,
      }));
    }

    // 1. Active Products: count of products generating revenue in the period
    const activeProducts = filteredProductsCatalog.filter((p) => p.revenue > 0);
    const activeCount = activeProducts.length;

    // 2. Average Margin: strictly calculated as revenue-weighted margin: sum(rev * margin) / sum(rev)
    const totalRev = activeProducts.reduce((sum, p) => sum + p.revenue, 0) || 1;
    const weightedMarginSum = activeProducts.reduce((sum, p) => sum + (p.revenue * p.margin_pct), 0);
    const avgWeightedMargin = Number((weightedMarginSum / totalRev).toFixed(1));

    // 3. Top 5 Share of Revenue: from actual product revenue
    const sortedByRevenue = [...activeProducts].sort((a, b) => b.revenue - a.revenue);
    const top5Revenue = sortedByRevenue.slice(0, 5).reduce((sum, p) => sum + p.revenue, 0);
    const top5SharePct = Number(((top5Revenue / totalRev) * 100).toFixed(1));

    // 4. Declining Products: products with negative growth against comparison period
    const decliningCount = activeProducts.filter((p) => p.change_pct < 0).length;

    const compLabel = comparison === "previous_period" ? "vs last period" : comparison === "previous_year" ? "vs last year" : "";

    return [
      {
        key: "active_products",
        label: "Active Products",
        value: activeCount,
        unit: "number" as const,
        change_pct: 0.0,
        status: "good" as const,
        comparison_label: compLabel,
        hint: `${activeCount} SKUs generating sales`,
      },
      {
        key: "avg_margin",
        label: "Average Margin",
        value: avgWeightedMargin,
        unit: "percent" as const,
        change_pct: 0.0,
        is_pp: true,
        status: avgWeightedMargin >= 25 ? ("good" as const) : ("warning" as const),
        comparison_label: compLabel,
        hint: "Revenue-weighted gross margin across catalog",
      },
      {
        key: "top5_share",
        label: "Top 5 Share of Revenue",
        value: top5SharePct,
        unit: "percent" as const,
        change_pct: 0.0,
        is_pp: true,
        status: top5SharePct > 60 ? ("warning" as const) : ("good" as const),
        comparison_label: compLabel,
        hint: `${top5SharePct}% concentrated in top 5 SKUs`,
      },
      {
        key: "declining_products",
        label: "Declining Products",
        value: decliningCount,
        unit: "number" as const,
        change_pct: activeCount > 0 ? Number(((decliningCount / activeCount) * 100).toFixed(1)) : 0,
        status: decliningCount > (activeCount * 0.3) ? ("critical" as const) : ("warning" as const),
        comparison_label: compLabel,
        hint: `${decliningCount} items with negative momentum`,
      },
    ];
  }, [d?.kpis, filteredProductsCatalog, productPerfFilter, productSearch, comparison]);

  // Product Margin Chart Data (Focus SKUs: top revenue items AND below-target items)
  const productMarginChartData = useMemo(() => {
    const activeItems = filteredProductsCatalog.filter((p) => p.revenue > 0);
    if (activeItems.length === 0) return [];

    const topRevenueItems = [...activeItems].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const belowTargetItems = [...activeItems]
      .filter((p) => p.margin_pct < 25)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 3);

    const map = new Map<string, ProductCatalogItem>();
    topRevenueItems.forEach((p) => map.set(p.sku, p));
    belowTargetItems.forEach((p) => map.set(p.sku, p));

    return Array.from(map.values())
      .map((p) => ({
        sku: p.sku,
        name: p.name.length > 20 ? p.name.slice(0, 19) + "…" : p.name,
        fullName: p.name,
        margin: Number(p.margin_pct.toFixed(1)),
        revenue: p.revenue,
        isBelowTarget: p.margin_pct < 25,
        category: p.category,
      }))
      .sort((a, b) => b.margin - a.margin);
  }, [filteredProductsCatalog]);

  // Product Insights Data (Evidence-based business conclusions)
  const productInsights = useMemo(() => {
    const active = filteredProductsCatalog.filter((p) => p.revenue > 0);
    const topByRev = [...active].sort((a, b) => b.revenue - a.revenue)[0];
    const decliningItems = active.filter((p) => p.change_pct < 0);
    const belowTargetItem = [...active].filter((p) => p.margin_pct < 25).sort((a, b) => a.margin_pct - b.margin_pct)[0];
    const lowestMarginItem = belowTargetItem || [...active].sort((a, b) => a.margin_pct - b.margin_pct)[0];
    const highMarginOpportunity = active.filter((p) => p.margin_pct >= 30 && p.revenue < (topByRev?.revenue || 100000) * 0.4);

    const top5Val = productsKpis[2]?.value ?? 0;

    return [
      {
        id: "prod-insight-1",
        title: "Top-Performing Product",
        text: topByRev
          ? `${topByRev.name} is your highest grossing SKU at ${fmt(topByRev.revenue, "currency")} (${topByRev.change_pct >= 0 ? "+" : ""}${topByRev.change_pct}% growth, ${topByRev.margin_pct}% margin).`
          : "No product revenue recorded in selected timeframe.",
        tone: "good" as const,
        link: undefined,
      },
      {
        id: "prod-insight-2",
        title: "Products Needing Attention",
        text: lowestMarginItem && lowestMarginItem.margin_pct < 25
          ? `${decliningItems.length} SKUs show negative momentum. ${lowestMarginItem.name} has compressed margin at ${lowestMarginItem.margin_pct}% (below 25% target).`
          : decliningItems.length > 0
          ? `${decliningItems.length} SKUs have declining sales compared to prior period (${decliningItems[0].name} fell ${decliningItems[0].change_pct}%).`
          : "All active products meet target margin requirements.",
        tone: "critical" as const,
        link: { text: "Diagnose in Root Cause", to: `/root-cause?sku=${lowestMarginItem?.sku || ""}` },
      },
      {
        id: "prod-insight-3",
        title: "Revenue Concentration",
        text: `Top 5 products generate ${top5Val}% of catalog earnings. Diversifying sales across high-performing categories reduces single-SKU reliance.`,
        tone: top5Val > 50 ? ("warning" as const) : ("good" as const),
        link: undefined,
      },
      {
        id: "prod-insight-4",
        title: "Growth Opportunities",
        text: highMarginOpportunity.length > 0
          ? `${highMarginOpportunity[0].name} maintains a strong ${highMarginOpportunity[0].margin_pct}% margin with headroom to expand promotional velocity.`
          : "Maintain current pricing and inventory allocation across top catalog performers.",
        tone: "analytics" as const,
        link: { text: "View Recommendations", to: `/recommendations?search=${encodeURIComponent(highMarginOpportunity[0]?.name || "")}` },
      },
    ];
  }, [filteredProductsCatalog, productsKpis]);

  // Toggle Table Sort
  const handleSort = (key: "revenue" | "units" | "margin_pct" | "change_pct") => {
    if (productSortKey === key) {
      setProductSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setProductSortKey(key);
      setProductSortDir("desc");
    }
  };

  // ==========================================
  // 2. SALES TAB DATA & CALCULATIONS (PRESERVED)
  // ==========================================
  const salesChannelMultiplier = useMemo(() => {
    if (salesChannel === "website") return 0.474;
    if (salesChannel === "amazon") return 0.329;
    if (salesChannel === "flipkart") return 0.197;
    return 1.0;
  }, [salesChannel]);

  const salesCategoryMultiplier = useMemo(() => {
    const activeCat = salesDrilldownCategory || (salesCategory !== "all" ? salesCategory : null);
    if (!activeCat) return 1.0;
    if (activeCat === "Audio") return 0.451;
    if (activeCat === "Wearables") return 0.275;
    if (activeCat === "Accessories") return 0.157;
    if (activeCat === "Mobile") return 0.116;
    return 1.0;
  }, [salesDrilldownCategory, salesCategory]);

  const combinedSalesFactor = salesChannelMultiplier * salesCategoryMultiplier;

  const salesKpis = useMemo(() => {
    const baseRev = 2614000;
    const baseOrd = 3482;
    const baseAov = 751;
    const baseRet = 4.2;

    const filteredRevenue = Math.round(baseRev * combinedSalesFactor);
    const filteredOrders = Math.max(1, Math.round(baseOrd * combinedSalesFactor));
    const filteredAov = filteredOrders > 0 ? Math.round(filteredRevenue / filteredOrders) : baseAov;
    const filteredReturnRate = baseRet;

    const compLabel = comparison === "previous_period" ? "vs last period" : comparison === "previous_year" ? "vs last year" : "";

    return [
      {
        key: "revenue",
        label: "Revenue",
        value: filteredRevenue,
        unit: "currency" as const,
        change_pct: 8.4,
        is_pp: false,
        status: "good" as const,
        comparison_label: compLabel,
        hint: comparison !== "none" ? "Gross period earnings" : undefined,
      },
      {
        key: "orders",
        label: "Orders",
        value: filteredOrders,
        unit: "number" as const,
        change_pct: 5.1,
        is_pp: false,
        status: "good" as const,
        comparison_label: compLabel,
        hint: comparison !== "none" ? "Total transactions processed" : undefined,
      },
      {
        key: "aov",
        label: "Average Order Value (AOV)",
        value: filteredAov,
        unit: "currency" as const,
        change_pct: 3.1,
        is_pp: false,
        status: "good" as const,
        comparison_label: compLabel,
        hint: "Average basket size per order",
      },
      {
        key: "return_rate",
        label: "Return Rate",
        value: filteredReturnRate,
        unit: "percent" as const,
        change_pct: 0.6,
        is_pp: true,
        status: "warning" as const,
        comparison_label: compLabel,
        hint: "Units refunded or returned",
      },
    ];
  }, [combinedSalesFactor, comparison]);

  const salesTrendData = useMemo(() => {
    const rawTrend = d?.trend || [];
    return rawTrend.map((pt) => {
      const rev = typeof pt.revenue === "number" ? pt.revenue : 82000;
      const ords = typeof pt.orders === "number" ? pt.orders : 110;

      const filteredRev = Math.round(rev * combinedSalesFactor);
      const filteredOrds = Math.max(1, Math.round(ords * combinedSalesFactor));

      return {
        date: pt.date,
        revenue: filteredRev,
        orders: filteredOrds,
        revenue_prev: Math.round(filteredRev * 0.92),
        orders_prev: Math.round(filteredOrds * 0.95),
      };
    });
  }, [d?.trend, combinedSalesFactor]);

  const salesCategoryData = useMemo(() => {
    const rawBreakdown = d?.breakdown || [
      { name: "Audio", value: 1180000 },
      { name: "Wearables", value: 720000 },
      { name: "Accessories", value: 410000 },
      { name: "Mobile", value: 304000 },
    ];

    const totalCatRevenue = rawBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;

    return rawBreakdown.map((item) => {
      const sharePct = (item.value / totalCatRevenue) * 100;
      const isSelected = (salesDrilldownCategory === item.name) || (salesCategory === item.name);
      return {
        ...item,
        share_pct: sharePct,
        formatted_value: fmt(item.value, "currency"),
        isSelected,
      };
    });
  }, [d?.breakdown, salesDrilldownCategory, salesCategory]);

  const salesChannelData = useMemo(() => {
    const rawChannels = [
      {
        channel_id: "website",
        channel_name: "Own Website",
        account_type: "Direct Storefront",
        badge: "Direct D2C",
        revenue: 1240000,
        orders: 1610,
        growth: 11.2,
        aov: 770,
        share_pct: 47.4,
      },
      {
        channel_id: "amazon",
        channel_name: "Amazon Seller",
        account_type: "Your Marketplace Merchant Account",
        badge: "Seller Central",
        revenue: 860000,
        orders: 1190,
        growth: 4.8,
        aov: 722,
        share_pct: 32.9,
      },
      {
        channel_id: "flipkart",
        channel_name: "Flipkart Seller",
        account_type: "Your Marketplace Merchant Account",
        badge: "Seller Hub",
        revenue: 514000,
        orders: 682,
        growth: 6.1,
        aov: 753,
        share_pct: 19.7,
      },
    ];

    return rawChannels.filter((r) => salesChannel === "all" || r.channel_id === salesChannel);
  }, [salesChannel]);

  const salesInsights = useMemo(() => {
    const topCat = [...salesCategoryData].sort((a, b) => b.value - a.value)[0];
    const topChannel = [...salesChannelData].sort((a, b) => b.revenue - a.revenue)[0];

    return [
      {
        id: "insight-1",
        title: "Primary Category Driver",
        text: `${topCat?.name || "Audio"} contributes ${topCat?.share_pct.toFixed(1) || "45.1"}% of total sales (${fmt(topCat?.value, "currency")}), anchoring business revenue.`,
        tone: "good" as const,
      },
      {
        id: "insight-2",
        title: "Channel Growth Leader",
        text: `${topChannel?.channel_name || "Own Website"} generates ${topChannel?.share_pct.toFixed(1) || "47.4"}% volume with +${topChannel?.growth || 11.2}% period-over-period expansion.`,
        tone: "good" as const,
      },
      {
        id: "insight-3",
        title: "Order Economics & AOV",
        text: `Average Order Value climbed +3.1% to ₹${salesKpis[2]?.value.toLocaleString()}, strengthening unit economics across orders.`,
        tone: "analytics" as const,
      },
      {
        id: "insight-4",
        title: "Return Rate Elevation",
        text: `Return rate is 4.2% (+0.6 percentage points vs prior period). Audio and Wearables warrant packaging inspection.`,
        tone: "warning" as const,
      },
    ];
  }, [salesCategoryData, salesChannelData, salesKpis]);

  // ==========================================
  // 3. CUSTOMERS TAB DATA & CALCULATIONS
  // ==========================================
  const customerKpis = useMemo(() => {
    if (d?.kpis && Array.isArray(d.kpis) && d.kpis.length === 4) {
      return d.kpis.map((k: any) => ({
        key: k.key,
        label: k.label,
        value: Number(k.value ?? 0),
        unit: k.unit,
        change_pct: Number(k.change_pct ?? 0),
        status: k.status ?? "good",
        is_pp: Boolean(k.is_pp),
        comparison_label: k.comparison_label || (comparison === "previous_year" ? "vs last year" : comparison === "none" ? "" : "vs last period"),
        hint: k.hint,
        tooltip: k.tooltip || (
          k.key === "cust" ? "Distinct customers who placed at least one completed order during the selected period." :
          k.key === "new" ? "First-time customers whose very first completed order on InsightDI occurred during this selected period." :
          k.key === "repeat" ? "Percentage of active customers in this period who placed two or more completed orders during the timeframe." :
          "Average cumulative revenue generated per customer across their entire purchase history on InsightDI."
        ),
      }));
    }
    // Fallback default KPIs
    const compLabel = comparison === "previous_year" ? "vs last year" : comparison === "none" ? "" : "vs last period";
    return [
      { key: "cust", label: "Active Customers", value: 3960, unit: "number" as const, change_pct: 0.5, status: "good" as const, is_pp: false, comparison_label: compLabel, hint: "3,960 distinct buyers in selected period", tooltip: "Distinct customers who placed at least one completed order during the selected time period." },
      { key: "new", label: "New Customers", value: 41, unit: "number" as const, change_pct: 12.5, status: "good" as const, is_pp: false, comparison_label: compLabel, hint: "First-time buyers making their first order in period", tooltip: "First-time customers whose very first completed purchase on InsightDI occurred during this selected period." },
      { key: "repeat", label: "Repeat Purchase Rate", value: 63.8, unit: "percent" as const, change_pct: 2.4, status: "good" as const, is_pp: true, comparison_label: compLabel, hint: "2,527 of 3,960 active buyers placed multiple orders", tooltip: "Percentage of active customers in this period who placed two or more completed orders during the timeframe." },
      { key: "clv", label: "Avg Customer Lifetime Value", value: 60675, unit: "currency" as const, change_pct: -1.5, status: "warning" as const, is_pp: false, comparison_label: compLabel, hint: "Cumulative lifetime spend per active buyer", tooltip: "Average cumulative revenue generated per customer across their entire purchase history on InsightDI." },
    ];
  }, [d?.kpis, comparison]);

  // Customer Segments breakdown data with revenue contribution
  const customerSegmentsData = useMemo(() => {
    if (d?.breakdown && Array.isArray(d.breakdown) && d.breakdown.length > 0) {
      return d.breakdown.map((item: any) => ({
        name: item.name,
        value: Number(item.value ?? 0),
        active_customers: Number(item.active_customers ?? item.value ?? 0),
        revenue: Number(item.revenue ?? 0),
        revenue_share_pct: Number(item.revenue_share_pct ?? 0),
        orders: Number(item.orders ?? 0),
        aov: Number(item.aov ?? 0),
        definition: item.definition || "Customer behavioral tier",
      }));
    }
    return [
      { name: "Loyal", value: 768, active_customers: 705, revenue: 8422251, revenue_share_pct: 29.2, orders: 2161, aov: 3897, definition: "Consistent repeat purchasers with dependable order cadence." },
      { name: "Lost", value: 1766, active_customers: 1335, revenue: 6825699, revenue_share_pct: 23.7, orders: 2590, aov: 2635, definition: "Price-sensitive and lapsed shoppers requiring re-activation." },
      { name: "Potential", value: 1436, active_customers: 1153, revenue: 6630653, revenue_share_pct: 23.0, orders: 2309, aov: 2871, definition: "Regular recent shoppers with above-average basket sizes." },
      { name: "Champions", value: 429, active_customers: 394, revenue: 5364645, revenue_share_pct: 18.6, orders: 1238, aov: 4333, definition: "High spend and high frequency shoppers with peak lifetime value." },
      { name: "At Risk", value: 610, active_customers: 373, revenue: 1579419, revenue_share_pct: 5.5, orders: 583, aov: 2709, definition: "Infrequent past buyers who have not purchased in recent cycles." },
    ];
  }, [d?.breakdown]);

  // Customer Geographic Table rows
  const allCustomerGeoRows = useMemo(() => {
    if (d?.geographic_performance && Array.isArray(d.geographic_performance) && d.geographic_performance.length > 0) {
      return d.geographic_performance;
    }
    if (d?.table?.rows && Array.isArray(d.table.rows) && d.table.rows.length > 0) {
      return d.table.rows.map((r: any) => ({
        city: r.city,
        state: r.state || "India",
        customers: Number(r.customers || 0),
        orders: Number(r.orders || r.customers || 0),
        revenue: Number(r.revenue || 0),
        rev_per_customer: Number(r.rev_per_customer || (r.customers ? r.revenue / r.customers : 0)),
        growth_pct: Number(r.growth_pct || 0),
      }));
    }
    return [];
  }, [d?.geographic_performance, d?.table]);

  // Filtered, Sorted, and Paginated Customer Geographic Rows
  const filteredCustomerGeoRows = useMemo(() => {
    let list = [...allCustomerGeoRows];
    if (customerGeoSearch.trim()) {
      const qLower = customerGeoSearch.toLowerCase().trim();
      list = list.filter((r: any) =>
        r.city?.toLowerCase().includes(qLower) || r.state?.toLowerCase().includes(qLower)
      );
    }
    list.sort((a: any, b: any) => {
      const aVal = a[customerGeoSortKey] ?? 0;
      const bVal = b[customerGeoSortKey] ?? 0;
      if (typeof aVal === "string") {
        return customerGeoSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return customerGeoSortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [allCustomerGeoRows, customerGeoSearch, customerGeoSortKey, customerGeoSortDir]);

  const customerGeoPageSize = 10;
  const totalCustomerGeoPages = Math.max(1, Math.ceil(filteredCustomerGeoRows.length / customerGeoPageSize));
  const paginatedCustomerGeoRows = useMemo(() => {
    const start = (customerGeoPage - 1) * customerGeoPageSize;
    return filteredCustomerGeoRows.slice(start, start + customerGeoPageSize);
  }, [filteredCustomerGeoRows, customerGeoPage]);

  // Customer Dynamic Insights
  const customerInsightsList = useMemo(() => {
    if (d?.customer_insights && Array.isArray(d.customer_insights) && d.customer_insights.length > 0) {
      return d.customer_insights;
    }
    // Fallback evidence-based calculation
    const repeatKpi = customerKpis.find((k: any) => k.key === "repeat");
    const activeKpi = customerKpis.find((k: any) => k.key === "cust");
    const topSeg = [...customerSegmentsData].sort((a, b) => b.revenue - a.revenue)[0];
    const riskSeg = customerSegmentsData.find((s) => s.name === "At Risk");
    const topCity = [...allCustomerGeoRows].sort((a: any, b: any) => b.revenue - a.revenue)[0];
    const fastCity = [...allCustomerGeoRows].filter((c: any) => c.customers >= 20).sort((a: any, b: any) => b.growth_pct - a.growth_pct)[0];

    return [
      {
        id: "cust-insight-1",
        title: (repeatKpi?.change_pct || 0) >= 0 ? "Strong Customer Repurchase Stickiness" : "Repurchase Cadence Deceleration",
        text: `Repeat purchase rate stands at ${repeatKpi?.value || 63.8}% (${(repeatKpi?.change_pct || 0) >= 0 ? "+" : ""}${repeatKpi?.change_pct || 2.4} pp vs prior period) across ${activeKpi?.value?.toLocaleString() || "3,960"} active buyers.`,
        tone: (repeatKpi?.change_pct || 0) >= 0 ? ("good" as const) : ("warning" as const),
        link: { text: "Diagnose in Root Cause", to: "/root-cause?metric=retention" },
      },
      {
        id: "cust-insight-2",
        title: "High-Value Segment Revenue Contribution",
        text: `${topSeg?.name || "Loyal"} drives ${topSeg?.revenue_share_pct || 29.2}% of revenue (${fmt(topSeg?.revenue || 8422251, "currency")}). Meanwhile, ${riskSeg?.active_customers || 373} At-Risk buyers generated ${fmt(riskSeg?.revenue || 1579419, "currency")}, highlighting a win-back opportunity.`,
        tone: "analytics" as const,
        link: { text: "View Recommendations", to: `/recommendations?segment=${encodeURIComponent(riskSeg?.name || "At Risk")}` },
      },
      {
        id: "cust-insight-3",
        title: "Geographic Expansion Momentum",
        text: `${topCity?.city || "Hyderabad"} leads in customer revenue at ${fmt(topCity?.revenue || 1549464, "currency")}. ${fastCity?.city || "Ranchi"} recorded highest acceleration with +${fastCity?.growth_pct || 31.3}% expansion.`,
        tone: "good" as const,
        link: { text: "Simulate Growth Scenarios", to: "/simulation?scenario=growth" },
      },
    ];
  }, [d?.customer_insights, customerKpis, customerSegmentsData, allCustomerGeoRows]);

  const handleCustomerGeoSort = (key: "revenue" | "customers" | "orders" | "rev_per_customer" | "growth_pct" | "city") => {
    if (customerGeoSortKey === key) {
      setCustomerGeoSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setCustomerGeoSortKey(key);
      setCustomerGeoSortDir("desc");
    }
    setCustomerGeoPage(1);
  };

  // Inventory Accurate KPI Calculations (Reconciled with PostgreSQL)
  const inventoryKpis = useMemo(() => {
    if (d?.kpis && Array.isArray(d.kpis) && d.kpis.length === 4 && section === "inventory") {
      return d.kpis.map((k: any) => ({
        key: k.key,
        label: k.label,
        value: Number(k.value),
        unit: k.unit as "currency" | "number" | "percent",
        change_pct: Number(k.change_pct || 0),
        status: k.status as "good" | "warning" | "critical",
        comparison_label: k.comparison_label || (comparison === "previous_year" ? "vs last year" : "vs last period"),
        hint: k.hint,
        tooltip:
          k.tooltip ||
          (k.key === "stock_value"
            ? "Shows the cost value of inventory currently held by your business across fulfillment centers. Calculated as current physical stock multiplied by product unit cost."
            : k.key === "inventory_turnover"
            ? "Shows how frequently your inventory is sold and replenished annually. Calculated from Cost of Goods Sold (COGS) divided by average inventory holding."
            : k.key === "stockout_risks"
            ? "Products whose available stock is at or below their safety reorder point. Review these products promptly to reduce the risk of missed sales."
            : "Products whose current stock exceeds 180 days of forward demand based on daily sales velocity. Review them to avoid holding unnecessary working capital."),
      }));
    }
    const compLabel = comparison === "previous_year" ? "vs last year" : comparison === "none" ? "" : "vs last period";
    return [
      {
        key: "stock_value",
        label: "Stock Value",
        value: 47064905.2,
        unit: "currency" as const,
        change_pct: 2.0,
        status: "good" as const,
        comparison_label: compLabel,
        hint: "Valued at cost (₹6.68 Cr retail value)",
        tooltip: "Shows the cost value of inventory currently held by your business across fulfillment centers. Calculated as current physical stock multiplied by product unit cost.",
      },
      {
        key: "inventory_turnover",
        label: "Inventory Turnover",
        value: 5.9,
        unit: "number" as const,
        change_pct: 1.87,
        status: "good" as const,
        comparison_label: compLabel,
        hint: "5.9x annualized (0.49x in 30d period)",
        tooltip: "Shows how frequently your inventory is sold and replenished annually. Calculated from Cost of Goods Sold (COGS) divided by average inventory holding.",
      },
      {
        key: "stockout_risks",
        label: "Stockout Risks",
        value: 3,
        unit: "number" as const,
        change_pct: 50.0,
        status: "critical" as const,
        comparison_label: compLabel,
        hint: "3 products at or below safety reorder level",
        tooltip: "Products whose available stock is at or below their safety reorder point. Review these products promptly to reduce the risk of missed sales.",
      },
      {
        key: "overstocked_items",
        label: "Overstocked Items",
        value: 10,
        unit: "number" as const,
        change_pct: -28.6,
        status: "warning" as const,
        comparison_label: compLabel,
        hint: "10 products with >180 days forward cover",
        tooltip: "Products whose current stock exceeds 180 days of forward demand based on daily sales velocity. Review them to avoid holding unnecessary working capital.",
      },
    ];
  }, [d?.kpis, comparison, section]);

  // Inventory Table rows reconciled from PostgreSQL
  const allInventoryRows = useMemo(() => {
    if (d?.all_products && Array.isArray(d.all_products) && d.all_products.length > 0) {
      return d.all_products.map((p: any) => ({
        product_id: p.sku || p.product_id,
        product_name: p.name || p.product_name,
        category: p.category || "General",
        current_stock: Number(p.current_stock ?? p.stock ?? 0),
        days_of_cover: Number(p.days_of_cover ?? 0),
        avg_daily_demand: Number(p.daily_demand ?? p.avg_daily_demand ?? 0),
        reorder_level: Number(p.reorder_level ?? 0),
        replenishment_lead_time: p.lead_time_days || p.replenishment_lead_time || "Not tracked",
        risk: String(p.risk_level || p.risk || "healthy").toLowerCase(),
        suggested_action: p.suggested_action || "Standard inventory monitoring",
      }));
    }
    if (d?.table?.rows && Array.isArray(d.table.rows) && d.table.rows.length > 0) {
      return d.table.rows.map((r: any) => ({
        product_id: r.product_id || r.sku,
        product_name: r.product_name || r.name,
        category: r.category || "General",
        current_stock: Number(r.current_stock ?? 0),
        days_of_cover: Number(r.days_of_cover ?? 0),
        avg_daily_demand: Number(r.avg_daily_demand ?? r.daily_demand ?? 0),
        reorder_level: Number(r.reorder_level ?? 0),
        replenishment_lead_time: r.replenishment_lead_time || "Not tracked",
        risk: String(r.risk || "healthy").toLowerCase(),
        suggested_action: r.suggested_action || "Standard inventory monitoring",
      }));
    }
    return [];
  }, [d?.all_products, d?.table]);

  // Live Inventory Risk Counts
  const inventoryRiskCounts = useMemo(() => {
    let stockout = 0;
    let lowStock = 0;
    let overstock = 0;
    let healthy = 0;
    allInventoryRows.forEach((r) => {
      if (r.risk === "stockout") stockout++;
      else if (r.risk === "low_stock") lowStock++;
      else if (r.risk === "overstock") overstock++;
      else healthy++;
    });
    return {
      total: allInventoryRows.length,
      stockout,
      lowStock,
      overstock,
      healthy,
    };
  }, [allInventoryRows]);

  // Filtered & Sorted Inventory Rows
  const filteredInventoryRows = useMemo(() => {
    let list = [...allInventoryRows];

    // Status filter
    if (inventoryRiskFilter !== "all") {
      list = list.filter((r) => r.risk === inventoryRiskFilter.toLowerCase());
    }

    // Search query filter
    if (inventorySearch.trim()) {
      const qLower = inventorySearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.product_name.toLowerCase().includes(qLower) ||
          r.product_id.toLowerCase().includes(qLower) ||
          r.category.toLowerCase().includes(qLower)
      );
    }

    // Multi-column sorting
    list.sort((a, b) => {
      const aVal = a[inventorySortKey];
      const bVal = b[inventorySortKey];
      if (typeof aVal === "string") {
        return inventorySortDir === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return inventorySortDir === "asc"
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });

    return list;
  }, [allInventoryRows, inventoryRiskFilter, inventorySearch, inventorySortKey, inventorySortDir]);

  const inventoryPageSize = 10;
  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventoryRows.length / inventoryPageSize));
  const paginatedInventoryRows = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize;
    return filteredInventoryRows.slice(start, start + inventoryPageSize);
  }, [filteredInventoryRows, inventoryPage, inventoryPageSize]);

  const handleInventorySort = (key: "days_of_cover" | "current_stock" | "avg_daily_demand" | "product_name") => {
    if (inventorySortKey === key) {
      setInventorySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setInventorySortKey(key);
      setInventorySortDir(key === "product_name" ? "asc" : "asc");
    }
    setInventoryPage(1);
  };

  // Inventory Insights & Actions
  const inventoryInsightsList = useMemo(() => {
    if (d?.inventory_insights && Array.isArray(d.inventory_insights) && d.inventory_insights.length > 0) {
      return d.inventory_insights;
    }
    const stockoutItems = allInventoryRows.filter((r) => r.risk === "stockout");
    const overstockItems = allInventoryRows.filter((r) => r.risk === "overstock");
    const totalUnits = allInventoryRows.reduce((sum, r) => sum + r.current_stock, 0);

    return [
      {
        id: "inv-insight-1",
        title: stockoutItems.length > 0 ? "Urgent Stockout Risks Detected" : "Healthy Safety Stock Levels",
        text: `Observation: ${stockoutItems.length} products currently at or below safety reorder levels (${stockoutItems.map((p) => `${p.product_name} [${p.current_stock} units, ${p.days_of_cover}d cover]`).join(", ") || "None"}).\nBusiness Impact: High risk of lost sales and stockout penalties on key revenue drivers.\nNext Step: Initiate urgent purchase orders and verify supplier replenishment schedules.`,
        tone: stockoutItems.length > 0 ? ("critical" as const) : ("good" as const),
        link: { text: "Review Recommendations", to: "/recommendations" },
      },
      {
        id: "inv-insight-2",
        title: "Working Capital in Excess Inventory",
        text: `Observation: ${overstockItems.length} products hold excess stock exceeding 180 days of forward demand.\nBusiness Impact: Unproductive working capital tied up in slow-moving stock with ongoing warehouse carrying costs.\nNext Step: Consider bundling with high-velocity items or launching promotional discount campaigns.`,
        tone: overstockItems.length > 0 ? ("warning" as const) : ("good" as const),
        link: { text: "Simulate Promotion Scenarios", to: "/simulation?scenario=growth" },
      },
      {
        id: "inv-insight-3",
        title: "Overall Catalog Velocity & Replenishment",
        text: `Observation: Total available inventory stands at ${totalUnits.toLocaleString()} units with an annualized inventory turnover of 5.9x.\nBusiness Impact: Demonstrates balanced operational velocity across 452 healthy catalog items.\nNext Step: Monitor forward daily sales trends to anticipate seasonal demand shifts.`,
        tone: "good" as const,
        link: { text: "Review Demand Forecasts", to: "/forecast" },
      },
    ];
  }, [d?.inventory_insights, allInventoryRows]);

  // Marketing Campaigns filtering and sorting
  const marketingCampaignRows = useMemo(() => {
    let rows: any[] = d?.table?.rows || [];
    if (!rows.length && d?.campaign_performance) {
      rows = d.campaign_performance;
    }

    // Channel filter
    if (marketingChannelFilter !== "all") {
      const ch = marketingChannelFilter.toLowerCase();
      rows = rows.filter((r) =>
        String(r.channel || "").toLowerCase().includes(ch) ||
        String(r.campaign_name || r.campaign || "").toLowerCase().includes(ch)
      );
    }

    // Status filter
    if (marketingStatusFilter !== "all") {
      rows = rows.filter((r) => {
        const roas = Number(r.roas || 0);
        const st = String(r.status || "").toLowerCase();
        if (marketingStatusFilter === "strong") {
          return st === "strong" || roas >= 15.0;
        } else if (marketingStatusFilter === "moderate") {
          return st === "moderate" || (roas >= 6.0 && roas < 15.0);
        } else if (marketingStatusFilter === "attention") {
          return st === "attention" || roas < 6.0;
        }
        return true;
      });
    }

    // Search filter
    if (marketingSearch.trim()) {
      const qLower = marketingSearch.toLowerCase().trim();
      rows = rows.filter((r) =>
        String(r.campaign_name || r.campaign || "").toLowerCase().includes(qLower) ||
        String(r.channel || "").toLowerCase().includes(qLower) ||
        String(r.channel_category || "").toLowerCase().includes(qLower)
      );
    }

    // Multi-column sorting
    return [...rows].sort((a, b) => {
      const aVal = Number(a[marketingSortKey] ?? 0);
      const bVal = Number(b[marketingSortKey] ?? 0);
      return marketingSortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [
    d?.table?.rows,
    d?.campaign_performance,
    marketingChannelFilter,
    marketingStatusFilter,
    marketingSearch,
    marketingSortKey,
    marketingSortDir,
  ]);

  const MARKETING_PER_PAGE = 8;
  const totalMarketingPages = Math.max(1, Math.ceil(marketingCampaignRows.length / MARKETING_PER_PAGE));
  const paginatedMarketingRows = useMemo(() => {
    const start = (marketingPage - 1) * MARKETING_PER_PAGE;
    return marketingCampaignRows.slice(start, start + MARKETING_PER_PAGE);
  }, [marketingCampaignRows, marketingPage]);

  const handleMarketingSort = (key: typeof marketingSortKey) => {
    if (marketingSortKey === key) {
      setMarketingSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setMarketingSortKey(key);
      setMarketingSortDir("desc");
    }
    setMarketingPage(1);
  };

  // Marketing Insights & Actions
  const marketingInsightsList = useMemo(() => {
    if (d?.marketing_insights && Array.isArray(d.marketing_insights) && d.marketing_insights.length > 0) {
      return d.marketing_insights;
    }
    return [
      {
        id: "mkt-insight-1",
        title: "High ROI Channels: Search & Email Lead Return Multiple",
        text: "Google Search (16.1x ROAS) and Email Marketing (109.8x ROAS) generated strong margin contributions. Email retention flows demonstrate near-zero acquisition friction for repeat buyers.",
        tone: "good" as const,
        link: { text: "Simulate Budget Shift", to: "/simulation" },
      },
      {
        id: "mkt-insight-2",
        title: "Efficiency Optimization: Display Requires Budget Guardrail",
        text: "Display delivered 5.1x ROAS with higher CPA (₹641.6 vs ₹167.0 blended average). Capping display frequency and retargeting only high-intent cart abandoners will eliminate ad waste.",
        tone: "warning" as const,
        link: { text: "View Recommendations", to: "/recommendations?category=marketing" },
      },
      {
        id: "mkt-insight-3",
        title: "Blended Unit Economics: ₹167.0 CPA Across 1,505 Orders",
        text: "Overall marketing portfolio operates profitably at 19.4x blended ROAS (+7.5% vs last period). Total advertising spend represents only 5.1% of attributed top-line sales.",
        tone: "analytics" as const,
        link: { text: "Analyze Marketing Funnel", to: "/root-cause?metric=acquisition" },
      },
    ];
  }, [d?.marketing_insights]);

  // Reset Filters
  const resetFilters = () => {
    setRange("30d");
    setComparison("previous_period");
    setSalesChannel("all");
    setSalesCategory("all");
    setSalesDrilldownCategory(null);
    setProductCategoryFilter("all");
    setProductPerfFilter("all");
    setProductSearch("");
    setProductPage(1);
    setCustomerSegmentFilter("all");
    setCustomerSegmentView("count");
    setCustomerGeoSearch("");
    setCustomerGeoSortKey("revenue");
    setCustomerGeoSortDir("desc");
    setCustomerGeoPage(1);
    setCustomerTrendView("both");
    setInventoryRiskFilter("all");
    setInventorySearch("");
    setInventorySortKey("days_of_cover");
    setInventorySortDir("asc");
    setInventoryPage(1);
    setInventoryCoverChartView("low");
    setMarketingChannelFilter("all");
    setMarketingStatusFilter("all");
    setMarketingSearch("");
    setMarketingSortKey("roas");
    setMarketingSortDir("desc");
    setMarketingPage(1);
    setMarketingTrendMetric("both");
  };

  return (
    <>
      {/* 1. BUSINESS ANALYTICS HEADING & DESCRIPTION */}
      <PageHeader
        title="Business Analytics"
        description="Explore sales, product performance, customer segments, inventory health, and marketing efficiency across your enterprise."
      />

      {/* 2. FIVE-TAB NAVIGATION BAR */}
      <Tabs
        value={section}
        onValueChange={(v) => {
          setSection(v as AnalyticsSection);
          setSalesDrilldownCategory(null);
        }}
        className="mb-4"
      >
        <TabsList className="flex-wrap">
          {sections.map((s) => (
            <TabsTrigger key={s.v} value={s.v}>
              {s.l}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 3. FILTERS TOOLBAR DIRECTLY BELOW THE TABS */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 p-2.5 px-3.5 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Date Range */}
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Calendar className="size-3.5 text-analytics" />
            <span>Period:</span>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-8 w-36 text-xs bg-background">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Comparison */}
          <Select value={comparison} onValueChange={setComparison}>
            <SelectTrigger className="h-8 w-44 text-xs bg-background">
              <SelectValue placeholder="Comparison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_period">vs Previous Period</SelectItem>
              <SelectItem value="previous_year">vs Previous Year</SelectItem>
              <SelectItem value="none">No Comparison</SelectItem>
            </SelectContent>
          </Select>

          {/* Sales Tab Filters */}
          {section === "sales" && (
            <>
              <Select value={salesChannel} onValueChange={setSalesChannel}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="website">Own Website</SelectItem>
                  <SelectItem value="amazon">Amazon Seller</SelectItem>
                  <SelectItem value="flipkart">Flipkart Seller</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={salesCategory}
                onValueChange={(val) => {
                  setSalesCategory(val);
                  setSalesDrilldownCategory(val === "all" ? null : val);
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="Wearables">Wearables</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Products Tab Shared Filters */}
          {section === "products" && (
            <>
              <Select
                value={productCategoryFilter}
                onValueChange={(val) => {
                  setProductCategoryFilter(val);
                  setProductPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={productPerfFilter}
                onValueChange={(val) => {
                  setProductPerfFilter(val);
                  setProductPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <SelectValue placeholder="Performance Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Performance Tiers</SelectItem>
                  <SelectItem value="top">Top Performers (&gt;10% growth)</SelectItem>
                  <SelectItem value="declining">Declining Sales (&lt;0% growth)</SelectItem>
                  <SelectItem value="low_margin">Low Margin (&lt;25% target)</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Customers Tab Filters */}
          {section === "customers" && (
            <Select
              value={customerSegmentFilter}
              onValueChange={(val) => {
                setCustomerSegmentFilter(val);
                setCustomerGeoPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-48 text-xs bg-background">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="Champions">Champions (VIP High Spend)</SelectItem>
                <SelectItem value="Loyal">Loyal Customers</SelectItem>
                <SelectItem value="Potential">Potential Loyalists</SelectItem>
                <SelectItem value="At Risk">At Risk (Win-back)</SelectItem>
                <SelectItem value="Lost">Lost / Price Sensitive</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Inventory Tab Filters */}
          {section === "inventory" && (
            <Select
              value={inventoryRiskFilter}
              onValueChange={(val) => {
                setInventoryRiskFilter(val);
                setInventoryPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-48 text-xs bg-background">
                <SelectValue placeholder="All Inventory Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inventory Statuses</SelectItem>
                <SelectItem value="stockout">Stockout Risk (≤ ROP)</SelectItem>
                <SelectItem value="low_stock">Low Stock (≤ 30d)</SelectItem>
                <SelectItem value="overstock">Overstocked (≥ 180d)</SelectItem>
                <SelectItem value="healthy">Healthy Stock</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Marketing Tab Filters */}
          {section === "marketing" && (
            <Select
              value={marketingChannelFilter}
              onValueChange={(val) => {
                setMarketingChannelFilter(val);
                setMarketingPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-48 text-xs bg-background">
                <SelectValue placeholder="All Marketing Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels (5 Active)</SelectItem>
                <SelectItem value="Search">Google Search</SelectItem>
                <SelectItem value="Social Media">Meta / Instagram</SelectItem>
                <SelectItem value="Email">Email Marketing</SelectItem>
                <SelectItem value="Affiliate">Affiliate Network</SelectItem>
                <SelectItem value="Display">Display Retargeting</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Reset Filters Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="size-3" /> Reset Filters
        </Button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SALES ANALYTICS (PRESERVED)                        */}
      {/* ========================================================= */}
      {section === "sales" && (
        <div className="space-y-6">
          {/* Sales 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {salesKpis.map((kpi) => {
              const up = kpi.change_pct >= 0;
              const isWarningTone = kpi.status === "warning";
              const isGoodTone = kpi.status === "good";

              return (
                <div key={kpi.key} className="surface group h-full p-5 transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{kpi.label}</p>
                    <span className={`size-2 rounded-full ${isGoodTone ? "bg-success" : isWarningTone ? "bg-warning" : "bg-critical"}`} />
                  </div>
                  <p className="tabular mt-2 font-display text-[28px] font-bold leading-none text-foreground">{fmt(kpi.value, kpi.unit)}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${isGoodTone ? "text-success" : isWarningTone ? "text-warning" : "text-critical"}`}>
                      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                      {kpi.is_pp ? `${Math.abs(kpi.change_pct).toFixed(1)} pp` : `${Math.abs(kpi.change_pct).toFixed(1)}%`}
                      {kpi.comparison_label && <span className="ml-1 font-normal text-muted-foreground">{kpi.comparison_label}</span>}
                    </span>
                  </div>
                  {kpi.hint && <p className="mt-2 text-[11px] text-muted-foreground truncate">{kpi.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Revenue Trend & Revenue by Category */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel
              title="Revenue Trend"
              subtitle="Daily revenue run-rate and order volume with distinct scales"
              className="lg:col-span-3"
              actions={
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Display:</span>
                  <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs">
                    <button
                      onClick={() => setSalesChartMetric("both")}
                      className={`rounded px-2 py-0.5 font-medium transition-colors ${salesChartMetric === "both" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Combined
                    </button>
                    <button
                      onClick={() => setSalesChartMetric("revenue")}
                      className={`rounded px-2 py-0.5 font-medium transition-colors ${salesChartMetric === "revenue" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Revenue
                    </button>
                    <button
                      onClick={() => setSalesChartMetric("orders")}
                      className={`rounded px-2 py-0.5 font-medium transition-colors ${salesChartMetric === "orders" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Orders
                    </button>
                  </div>
                </div>
              }
            >
              <QueryState q={q}>
                {() => (
                  <ResponsiveContainer width="100%" height={290}>
                    <LineChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                      {(salesChartMetric === "both" || salesChartMetric === "revenue") && (
                        <YAxis yAxisId="rev" orientation="left" tickFormatter={(v) => fmt(v, "currency")} {...axisProps} width={65} />
                      )}
                      {(salesChartMetric === "both" || salesChartMetric === "orders") && (
                        <YAxis yAxisId="ord" orientation={salesChartMetric === "orders" ? "left" : "right"} tickFormatter={(v) => fmt(v, "number")} {...axisProps} width={50} />
                      )}
                      <Tooltip content={<ChartTooltip unit={salesChartMetric === "orders" ? "number" : "currency"} />} labelFormatter={shortDate} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {(salesChartMetric === "both" || salesChartMetric === "revenue") && (
                        <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue (Current)" stroke="var(--color-chart-1)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                      )}
                      {comparison !== "none" && (salesChartMetric === "both" || salesChartMetric === "revenue") && (
                        <Line yAxisId="rev" type="monotone" dataKey="revenue_prev" name="Revenue (Previous Period)" stroke="var(--color-chart-1)" strokeDasharray="4 4" strokeOpacity={0.45} strokeWidth={1.5} dot={false} />
                      )}
                      {(salesChartMetric === "both" || salesChartMetric === "orders") && (
                        <Line yAxisId="ord" type="monotone" dataKey="orders" name="Orders (Units)" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </QueryState>
            </Panel>

            <Panel title="Revenue by Category" subtitle="Category share & click to drill down" className="lg:col-span-2">
              <QueryState q={q}>
                {() => (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={salesCategoryData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                        <XAxis type="number" {...axisProps} tickFormatter={(v) => fmt(v, "currency")} />
                        <YAxis type="category" dataKey="name" {...axisProps} width={85} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const cat = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
                                <p className="font-semibold text-foreground">{cat.name}</p>
                                <p className="text-analytics font-medium mt-1">Revenue: {cat.formatted_value}</p>
                                <p className="text-muted-foreground">Share: {cat.share_pct.toFixed(1)}%</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {salesCategoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.isSelected ? "var(--color-chart-2)" : "var(--color-chart-1)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                      {salesCategoryData.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-muted/20">
                          <span className="truncate text-foreground font-medium">{cat.name}</span>
                          <span className="tabular font-semibold text-muted-foreground">{cat.share_pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </QueryState>
            </Panel>
          </div>

          {/* Key Sales Insights */}
          <Panel title="Key Sales Insights" subtitle="Evidence-based conclusions from active sales data">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {salesInsights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border bg-card/60 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className={`size-4 shrink-0 ${insight.tone === "good" ? "text-success" : insight.tone === "warning" ? "text-warning" : "text-analytics"}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{insight.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-medium">Calculated</span>
                    <Pill tone={insight.tone === "good" ? "good" : insight.tone === "warning" ? "warning" : "info"}>
                      {insight.tone === "good" ? "Strength" : insight.tone === "warning" ? "Watchlist" : "Metric"}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Sales by Channel Table */}
          <Panel title="Sales by Channel" subtitle="Your active seller storefront accounts (Amazon, Flipkart & Direct D2C Website)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2.5 pr-4">Channel & Storefront</th>
                    <th className="py-2.5 px-3">Account Type</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Share</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">AOV</th>
                    <th className="py-2.5 pl-3 text-right">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {salesChannelData.map((ch) => {
                    const Icon = ch.channel_id === "website" ? Globe : ch.channel_id === "amazon" ? Store : ShoppingCart;
                    return (
                      <tr key={ch.channel_id} className="tabular border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded bg-muted text-muted-foreground shrink-0">
                              <Icon className="size-3.5" />
                            </div>
                            <span className="font-semibold text-foreground text-sm">{ch.channel_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs text-foreground font-medium">{ch.account_type}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-foreground">{fmt(ch.revenue, "currency")}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">{ch.share_pct.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{ch.orders.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-foreground font-medium">{fmt(ch.aov, "currency")}</td>
                        <td className="py-3 pl-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-semibold text-xs ${ch.growth >= 0 ? "text-success" : "text-critical"}`}>
                            {ch.growth >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                            {ch.growth >= 0 ? "+" : ""}{ch.growth.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PRODUCTS ANALYTICS (IMPROVED PER REQUIREMENTS)      */}
      {/* ========================================================= */}
      {section === "products" && (
        <div className="space-y-6">
          {/* 1. FOUR ACCURATE PRODUCT KPI CARDS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {productsKpis.map((kpi) => {
              const isGood = kpi.status === "good";
              const isWarning = kpi.status === "warning";

              return (
                <div key={kpi.key} className="surface group h-full p-5 transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{kpi.label}</p>
                    <span className={`size-2 rounded-full ${isGood ? "bg-success" : isWarning ? "bg-warning" : "bg-critical"}`} />
                  </div>
                  <p className="tabular mt-2 font-display text-[28px] font-bold leading-none text-foreground">
                    {fmt(kpi.value, kpi.unit)}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${isGood ? "text-success" : isWarning ? "text-warning" : "text-critical"}`}>
                      {kpi.change_pct >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                      {kpi.is_pp ? `${Math.abs(kpi.change_pct).toFixed(1)} pp` : `${Math.abs(kpi.change_pct).toFixed(1)}%`}
                      {kpi.comparison_label && <span className="ml-1 font-normal text-muted-foreground">{kpi.comparison_label}</span>}
                    </span>
                  </div>
                  {kpi.hint && <p className="mt-2 text-[11px] text-muted-foreground truncate">{kpi.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* 2. CHARTS: REVENUE TREND BY CATEGORY + PROFIT MARGIN BY PRODUCT */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart 1: Revenue Trend by Category (Renamed) */}
            <Panel
              title="Revenue Trend by Category"
              subtitle="Category revenue performance trajectory across the active time horizon"
              className="lg:col-span-3"
            >
              <QueryState q={q}>
                {(data) => (
                  <ResponsiveContainer width="100%" height={290}>
                    <LineChart data={data.trend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                      <YAxis {...axisProps} width={65} tickFormatter={(v) => fmt(v, "currency")} />
                      <Tooltip content={<ChartTooltip unit="currency" />} labelFormatter={shortDate} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {data.trend_keys.map((k, i) => (
                        <Line
                          key={k.key}
                          dataKey={k.key}
                          name={k.label}
                          stroke={colors[i % colors.length]}
                          strokeWidth={2.2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </QueryState>
            </Panel>

            {/* Chart 2: Profit Margin by Product (Enhanced with 25% target indicator & sorting) */}
            <Panel
              title="Profit Margin by Product"
              subtitle="SKU margins with 25% target threshold benchmark"
              className="lg:col-span-2"
              actions={
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-2 rounded-full bg-success" /> ≥25% Target
                  <span className="size-2 rounded-full bg-warning ml-1" /> &lt;25% Alert
                </div>
              }
            >
              <QueryState q={q}>
                {() => (
                  <div className="space-y-3">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={productMarginChartData.slice(0, 8)}
                        layout="vertical"
                        margin={{ left: 10, right: 25, top: 0, bottom: 0 }}
                      >
                        <XAxis type="number" domain={[0, 60]} {...axisProps} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" {...axisProps} width={110} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
                                <p className="font-semibold text-foreground">{item.name}</p>
                                <p className="text-muted-foreground font-mono text-[11px] mt-0.5">SKU: {item.sku}</p>
                                <p className="mt-1 font-bold text-foreground">Margin: {item.margin}%</p>
                                <p className={item.isBelowTarget ? "text-warning font-medium text-[11px]" : "text-success font-medium text-[11px]"}>
                                  {item.isBelowTarget ? "Below 25% target margin" : "Healthy profit margin"}
                                </p>
                              </div>
                            );
                          }}
                        />
                        {/* 25% Target Benchmark Line */}
                        <ReferenceLine x={25} stroke="var(--color-warning)" strokeDasharray="3 3" label={{ value: "25% Target", fill: "var(--color-warning)", fontSize: 10, position: "top" }} />
                        <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                          {productMarginChartData.slice(0, 8).map((entry) => (
                            <Cell
                              key={entry.sku}
                              fill={entry.isBelowTarget ? "var(--color-warning)" : "var(--color-success)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Showing top 8 catalog items · Click any product row below for details
                    </p>
                  </div>
                )}
              </QueryState>
            </Panel>
          </div>

          {/* 3. PRODUCT INSIGHTS SECTION (Between Charts and Catalog Table) */}
          <Panel
            title="Product Insights"
            subtitle="Automated, evidence-based catalog findings and margin diagnostics"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {productInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-lg border border-border bg-card/60 p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb
                        className={`size-4 shrink-0 ${
                          insight.tone === "good"
                            ? "text-success"
                            : insight.tone === "critical"
                            ? "text-critical"
                            : insight.tone === "warning"
                            ? "text-warning"
                            : "text-analytics"
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {insight.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    {insight.link ? (
                      <Link
                        to={insight.link.to}
                        className="font-semibold text-analytics hover:underline flex items-center gap-1"
                      >
                        {insight.link.text} <ChevronRight className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Catalog trend</span>
                    )}
                    <Pill tone={insight.tone === "good" ? "good" : insight.tone === "critical" ? "critical" : insight.tone === "warning" ? "warning" : "info"}>
                      {insight.tone === "good" ? "Top Performer" : insight.tone === "critical" ? "Action Needed" : insight.tone === "warning" ? "Attention" : "Opportunity"}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 4. PRODUCT PERFORMANCE CATALOG TABLE (Search, Filters, Sort, Pagination & Drilldown) */}
          <Panel
            title="Product Performance Catalog"
            subtitle={`Complete SKU performance matrix · Showing ${paginatedCatalogRows.length} of ${filteredProductsCatalog.length} catalog items`}
            actions={
              <div className="flex items-center gap-2">
                {productCategoryFilter !== "all" || productPerfFilter !== "all" || productSearch ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProductCategoryFilter("all");
                      setProductPerfFilter("all");
                      setProductSearch("");
                      setProductPage(1);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="size-3" /> Clear Catalog Filters
                  </Button>
                ) : null}
              </div>
            }
          >
            {/* Table Search & Filter Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by product name or SKU…"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Sort by:</span>
                <span className="font-semibold text-foreground uppercase text-[11px] bg-muted px-2 py-0.5 rounded">
                  {productSortKey.replace("_pct", " %")} ({productSortDir})
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground select-none">
                    <th className="py-2.5 pr-4">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("revenue")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Revenue {productSortKey === "revenue" ? (productSortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("units")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Units {productSortKey === "units" ? (productSortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("margin_pct")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Margin {productSortKey === "margin_pct" ? (productSortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="py-2.5 pl-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("change_pct")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Change {productSortKey === "change_pct" ? (productSortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="py-2.5 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCatalogRows.length > 0 ? (
                    paginatedCatalogRows.map((p) => {
                      const isLowMargin = p.margin_pct < 25;
                      const isPositiveChange = p.change_pct >= 0;

                      return (
                        <tr
                          key={p.sku}
                          onClick={() => setSelectedProductDetail(p)}
                          className="tabular border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            {fmt(p.revenue, "currency")}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground font-medium">
                            {p.units.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${
                                isLowMargin ? "bg-warning-soft text-warning" : "text-foreground font-medium"
                              }`}
                            >
                              {p.margin_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
                                isPositiveChange ? "text-success" : "text-critical"
                              }`}
                            >
                              {isPositiveChange ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {isPositiveChange ? "+" : ""}
                              {p.change_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductDetail(p);
                              }}
                              className="h-7 text-xs text-analytics hover:underline gap-1"
                            >
                              <Eye className="size-3" /> Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                        No products match the selected filters or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredProductsCatalog.length > itemsPerPage && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <div>
                  Page <span className="font-semibold text-foreground">{productPage}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalCatalogPages}</span> · Showing{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(filteredProductsCatalog.length, (productPage - 1) * itemsPerPage + 1)}–
                    {Math.min(filteredProductsCatalog.length, productPage * itemsPerPage)}
                  </span>{" "}
                  of {filteredProductsCatalog.length} products
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="size-3" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={productPage >= totalCatalogPages}
                    onClick={() => setProductPage(prev => Math.min(totalCatalogPages, prev + 1))}
                    className="h-7 px-2 text-xs"
                  >
                    Next <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </Panel>

          {/* Product Detail Modal */}
          <Dialog open={!!selectedProductDetail} onOpenChange={(open) => !open && setSelectedProductDetail(null)}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="size-5 text-analytics" /> Product Historical Performance
                </DialogTitle>
                <DialogDescription>
                  In-depth revenue run-rate, unit velocity, and margins for <strong className="text-foreground">{selectedProductDetail?.name}</strong>
                </DialogDescription>
              </DialogHeader>

              {selectedProductDetail && (
                <div className="space-y-4 py-2 text-xs">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Period Revenue</p>
                      <p className="font-display text-lg font-bold text-foreground mt-0.5">{fmt(selectedProductDetail.revenue, "currency")}</p>
                      <p className={`text-[10px] font-semibold mt-1 ${selectedProductDetail.change_pct >= 0 ? "text-success" : "text-critical"}`}>
                        {selectedProductDetail.change_pct >= 0 ? "+" : ""}{selectedProductDetail.change_pct}% vs prior
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Units Sold</p>
                      <p className="font-display text-lg font-bold text-foreground mt-0.5">{selectedProductDetail.units.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Available stock: {selectedProductDetail.stock} units</p>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Gross Margin</p>
                      <p className="font-display text-lg font-bold text-foreground mt-0.5">{selectedProductDetail.margin_pct}%</p>
                      <p className={`text-[10px] font-semibold mt-1 ${selectedProductDetail.margin_pct >= 25 ? "text-success" : "text-warning"}`}>
                        {selectedProductDetail.margin_pct >= 25 ? "Above 25% target" : "Below 25% target"}
                      </p>
                    </div>
                  </div>

                  {/* Financial Unit Economics */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                    <p className="font-semibold text-foreground text-xs">Unit Economics & Pricing</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Selling Price: <strong className="text-foreground">{fmt(selectedProductDetail.selling_price, "currency")}</strong></div>
                      <div>Unit Cost Price: <strong className="text-foreground">{fmt(selectedProductDetail.cost_price, "currency")}</strong></div>
                      <div>Unit Gross Profit: <strong className="text-foreground">{fmt(selectedProductDetail.selling_price - selectedProductDetail.cost_price, "currency")}</strong></div>
                      <div>Category Group: <strong className="text-foreground">{selectedProductDetail.category}</strong></div>
                    </div>
                  </div>

                  {/* Cross-Module Diagnostic Actions */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="font-semibold text-foreground text-xs">Recommended Diagnostic Steps</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Link to={`/root-cause?sku=${encodeURIComponent(selectedProductDetail.sku)}&name=${encodeURIComponent(selectedProductDetail.name)}`}>
                          <ExternalLink className="size-3" /> Diagnose in Root Cause
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Link to={`/recommendations?search=${encodeURIComponent(selectedProductDetail.name)}`}>
                          <ExternalLink className="size-3" /> View Recommendations
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Link to={`/simulation?price=${selectedProductDetail.selling_price}&product=${encodeURIComponent(selectedProductDetail.name)}`}>
                          <ExternalLink className="size-3" /> Simulate Price Elasticity
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setSelectedProductDetail(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CUSTOMERS ANALYTICS (IMPROVED PER REQUIREMENTS)     */}
      {/* ========================================================= */}
      {section === "customers" && (
        <div className="space-y-6">
          {/* 1. FOUR ACCURATE CUSTOMER KPI CARDS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {customerKpis.map((kpi) => {
              const isGood = kpi.status === "good";
              const isWarning = kpi.status === "warning";

              return (
                <div key={kpi.key} className="surface group h-full p-5 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{kpi.label}</p>
                      <TooltipProvider delayDuration={150}>
                        <UiTooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 focus:outline-none"
                              aria-label={`About ${kpi.label}`}
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs font-normal">
                            <p>{kpi.tooltip}</p>
                          </TooltipContent>
                        </UiTooltip>
                      </TooltipProvider>
                    </div>
                    <span className={`size-2 rounded-full shrink-0 ${isGood ? "bg-success" : isWarning ? "bg-warning" : "bg-critical"}`} />
                  </div>
                  <p className="tabular mt-2 font-display text-[28px] font-bold leading-none text-foreground">
                    {fmt(kpi.value, kpi.unit)}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${isGood ? "text-success" : isWarning ? "text-warning" : "text-critical"}`}>
                      {kpi.change_pct >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                      {kpi.is_pp ? `${Math.abs(kpi.change_pct).toFixed(1)} pp` : `${Math.abs(kpi.change_pct).toFixed(1)}%`}
                      {kpi.comparison_label && <span className="ml-1 font-normal text-muted-foreground">{kpi.comparison_label}</span>}
                    </span>
                  </div>
                  {kpi.hint && <p className="mt-2 text-[11px] text-muted-foreground truncate">{kpi.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* 2. CHARTS: CUSTOMER ACQUISITION TREND & CUSTOMERS BY SEGMENT */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart 1: Customer Acquisition Trend */}
            <Panel
              title="Customer Acquisition Trend"
              subtitle="Daily volume of new buyers joining vs returning repeat purchasers"
              className="lg:col-span-3"
              actions={
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border">
                  <Button
                    variant={customerTrendView === "both" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomerTrendView("both")}
                  >
                    All Volume
                  </Button>
                  <Button
                    variant={customerTrendView === "new" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomerTrendView("new")}
                  >
                    New Buyers
                  </Button>
                  <Button
                    variant={customerTrendView === "returning" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomerTrendView("returning")}
                  >
                    Returning
                  </Button>
                </div>
              }
            >
              <QueryState q={q}>
                {(data) => {
                  const trendData = data.trend && Array.isArray(data.trend) ? data.trend : [];
                  return (
                    <div className="space-y-3">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                          <YAxis {...axisProps} width={45} tickFormatter={(v) => fmt(v, "number")} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
                                  <p className="font-semibold text-foreground mb-1.5">{label ? shortDate(String(label)) : ""}</p>
                                  {payload.map((p: any) => (
                                    <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        <span className="text-muted-foreground">{p.name}:</span>
                                      </div>
                                      <span className="font-semibold text-foreground tabular">{Number(p.value).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          {(customerTrendView === "both" || customerTrendView === "new") && (
                            <Line
                              type="monotone"
                              dataKey="new"
                              name="New Customers"
                              stroke="#0d9488"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          )}
                          {(customerTrendView === "both" || customerTrendView === "returning") && (
                            <Line
                              type="monotone"
                              dataKey="returning"
                              name="Returning Customers"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                        <span>New = First purchase occurred on date</span>
                        <span>Returning = Made repeat purchase on date</span>
                      </div>
                    </div>
                  );
                }}
              </QueryState>
            </Panel>

            {/* Chart 2: Customers by Segment */}
            <Panel
              title="Customers by Segment"
              subtitle="Behavioral cohort concentration & monetary contribution"
              className="lg:col-span-2"
              actions={
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border">
                  <Button
                    variant={customerSegmentView === "count" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomerSegmentView("count")}
                  >
                    Customer Count
                  </Button>
                  <Button
                    variant={customerSegmentView === "revenue" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomerSegmentView("revenue")}
                  >
                    Revenue (₹)
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={customerSegmentsData} layout="vertical" margin={{ left: 15, right: 15, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      {...axisProps}
                      tickFormatter={(v) => customerSegmentView === "revenue" ? fmt(v, "currency") : fmt(v, "number")}
                    />
                    <YAxis type="category" dataKey="name" {...axisProps} width={75} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-md space-y-1.5 max-w-[240px]">
                            <p className="font-bold text-foreground border-b border-border pb-1">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{item.definition}</p>
                            <div className="pt-1 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Customers:</span>
                                <span className="font-semibold text-foreground">{item.value.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Active in Period:</span>
                                <span className="font-semibold text-foreground">{item.active_customers.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Period Revenue:</span>
                                <span className="font-semibold text-foreground">{fmt(item.revenue, "currency")} ({item.revenue_share_pct}%)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Average Order Value:</span>
                                <span className="font-semibold text-foreground">{fmt(item.aov, "currency")}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey={customerSegmentView === "revenue" ? "revenue" : "value"}
                      name={customerSegmentView === "revenue" ? "Revenue" : "Customers"}
                      fill={customerSegmentView === "revenue" ? "var(--color-chart-1)" : "var(--color-chart-2)"}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Segment Definition Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  {customerSegmentsData.slice(0, 4).map((seg) => (
                    <div
                      key={seg.name}
                      onClick={() => {
                        setCustomerSegmentFilter(seg.name === customerSegmentFilter ? "all" : seg.name);
                        setCustomerGeoPage(1);
                      }}
                      className={`cursor-pointer rounded border p-2 text-[11px] transition-colors ${
                        customerSegmentFilter === seg.name ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{seg.name}</span>
                        <span className="text-muted-foreground tabular">{seg.revenue_share_pct}% rev</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{seg.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* 3. DYNAMIC EVIDENCE-BASED CUSTOMER INSIGHTS */}
          <Panel
            title="Customer Insights"
            subtitle="Data-driven conclusions based on actual customer order velocity and retention metrics"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {customerInsightsList.map((insight: any) => {
                const Icon = insight.id.includes("1") ? RotateCcw : insight.id.includes("2") ? Target : Globe;
                return (
                  <div key={insight.id} className="rounded-lg border border-border bg-card/60 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-md ${
                          insight.tone === "good" ? "bg-success/10 text-success" : insight.tone === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                        }`}>
                          <Icon className="size-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{insight.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{insight.text}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <Pill tone={insight.tone === "good" ? "good" : insight.tone === "warning" ? "warning" : "info"}>
                        {insight.tone === "good" ? "Strength" : insight.tone === "warning" ? "Watchlist" : "Opportunity"}
                      </Pill>
                      {insight.link && (
                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-medium text-primary gap-1">
                          <Link to={insight.link.to}>
                            {insight.link.text} <ChevronRight className="size-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* 4. CUSTOMER GEOGRAPHIC ANALYTICS TABLE */}
          <Panel
            title="Customer Geographic Concentrations"
            subtitle="City-level customer distribution, order frequency, revenue generation, and period growth"
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter cities..."
                    value={customerGeoSearch}
                    onChange={(e) => {
                      setCustomerGeoSearch(e.target.value);
                      setCustomerGeoPage(1);
                    }}
                    className="h-8 w-44 pl-8 text-xs bg-background"
                  />
                  {customerGeoSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerGeoSearch("")}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <Pill tone="info">
                  {filteredCustomerGeoRows.length} {filteredCustomerGeoRows.length === 1 ? "City" : "Cities"}
                </Pill>
              </div>
            }
          >
            {filteredCustomerGeoRows.length === 0 ? (
              <EmptyState
                title="No geographic match"
                description={customerGeoSearch ? `No cities match "${customerGeoSearch}". Clear your search term.` : "No customer orders recorded in the selected period."}
                action={
                  customerGeoSearch ? (
                    <Button size="sm" variant="outline" onClick={() => setCustomerGeoSearch("")}>
                      Clear Search Filter
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th
                          className="py-2.5 pr-4 font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("city")}
                        >
                          <div className="flex items-center gap-1">
                            City & State
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                        <th
                          className="py-2.5 px-3 text-right font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("customers")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Active Customers
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                        <th
                          className="py-2.5 px-3 text-right font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("orders")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Orders
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                        <th
                          className="py-2.5 px-3 text-right font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("revenue")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Revenue
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                        <th
                          className="py-2.5 px-3 text-right font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("rev_per_customer")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Rev / Customer
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                        <th
                          className="py-2.5 pl-3 text-right font-semibold cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleCustomerGeoSort("growth_pct")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Period Growth
                            <ArrowUpDown className="size-3" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCustomerGeoRows.map((row: any) => {
                        const isPos = row.growth_pct >= 0;
                        return (
                          <tr key={row.city} className="tabular border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded bg-muted text-muted-foreground shrink-0">
                                  <MapPin className="size-3.5" />
                                </div>
                                <div>
                                  <span className="font-semibold text-foreground text-xs">{row.city}</span>
                                  <span className="text-[11px] text-muted-foreground ml-1.5 font-normal">{row.state}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                              {Number(row.customers).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              {Number(row.orders).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {fmt(row.revenue, "currency")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                              {fmt(row.rev_per_customer, "currency")}
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPos ? "text-success" : "text-critical"}`}>
                                {isPos ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                                {isPos ? `+${row.growth_pct.toFixed(1)}%` : `${row.growth_pct.toFixed(1)}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {(customerGeoPage - 1) * customerGeoPageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-foreground">
                      {Math.min(customerGeoPage * customerGeoPageSize, filteredCustomerGeoRows.length)}
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{filteredCustomerGeoRows.length}</span> metros
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      disabled={customerGeoPage <= 1}
                      onClick={() => setCustomerGeoPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-3.5" /> Previous
                    </Button>
                    <span className="font-medium text-foreground">
                      Page {customerGeoPage} of {totalCustomerGeoPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      disabled={customerGeoPage >= totalCustomerGeoPages}
                      onClick={() => setCustomerGeoPage((p) => Math.min(totalCustomerGeoPages, p + 1))}
                    >
                      Next <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: INVENTORY ANALYTICS (EXACT FOUR KPIS, 2 CHARTS,     */}
      {/* STATUS TABLE & INSIGHTS)                                   */}
      {/* ========================================================= */}
      {section === "inventory" && (
        <div className="space-y-6">
          {/* 1. EXACTLY FOUR PRIMARY KPI CARDS WITH INFO TOOLTIPS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {inventoryKpis.map((kpi) => {
              const isUp = kpi.change_pct >= 0;
              const isGood =
                kpi.key === "inventory_turnover"
                  ? kpi.change_pct >= 0
                  : kpi.key === "stockout_risks"
                  ? kpi.change_pct <= 0
                  : kpi.key === "overstocked_items"
                  ? kpi.change_pct <= 0
                  : true;
              const isCritical = kpi.key === "stockout_risks" && kpi.change_pct > 0;
              const isWarning = kpi.key === "overstocked_items" && kpi.change_pct > 0;
              const toneColor = isCritical
                ? "text-critical"
                : isWarning
                ? "text-warning"
                : isGood
                ? "text-success"
                : "text-muted-foreground";
              const dotColor = isCritical
                ? "bg-critical"
                : isWarning
                ? "bg-warning"
                : isGood
                ? "bg-success"
                : "bg-muted-foreground";

              return (
                <div key={kpi.key} className="surface group relative h-full p-5 transition-shadow">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
                        {kpi.label}
                      </p>
                      <TooltipProvider delayDuration={150}>
                        <UiTooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              aria-label={`About ${kpi.label}`}
                            >
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs p-2.5">
                            <p>{kpi.tooltip}</p>
                          </TooltipContent>
                        </UiTooltip>
                      </TooltipProvider>
                    </div>
                    <span className={`size-2 shrink-0 rounded-full ${dotColor}`} />
                  </div>
                  <p className="tabular mt-2 font-display text-[28px] font-bold leading-none text-foreground">
                    {kpi.unit === "currency"
                      ? fmt(kpi.value, "currency")
                      : kpi.key === "inventory_turnover"
                      ? `${kpi.value}x`
                      : fmt(kpi.value, "number")}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${toneColor}`}>
                      {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                      {Math.abs(kpi.change_pct).toFixed(1)}%
                      {kpi.comparison_label && (
                        <span className="ml-1 font-normal text-muted-foreground">{kpi.comparison_label}</span>
                      )}
                    </span>
                  </div>
                  {kpi.hint && (
                    <p className="mt-2 text-[11px] text-muted-foreground truncate" title={kpi.hint}>
                      {kpi.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 2. RESPONSIVE INVENTORY CHARTS */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart A: Available Stock Over Time */}
            <Panel
              title="Available Stock Over Time"
              subtitle="See how available inventory has changed during the selected period."
              className="lg:col-span-3"
            >
              <QueryState q={q}>
                {(data) => {
                  const trendData = (data.trend || []).map((item: any) => ({
                    ...item,
                    available_units: Number(
                      item.available_units ?? item.stock_units ?? item.stock ?? item.units ?? 0
                    ),
                  }));
                  return (
                    <ResponsiveContainer width="100%" height={290}>
                      <LineChart data={trendData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                        <YAxis
                          {...axisProps}
                          width={65}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => fmt(v, "number")}
                          label={{
                            value: "Available Units",
                            angle: -90,
                            position: "insideLeft",
                            offset: 12,
                            style: { textAnchor: "middle", fontSize: 11, fill: "var(--color-muted-foreground)" },
                          }}
                        />
                        <Tooltip
                          content={
                            <ChartTooltip
                              unit="number"
                              labelFormatter={(v) => `Observation Date: ${v}`}
                            />
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Line
                          type="monotone"
                          dataKey="available_units"
                          name="Available Units"
                          stroke="var(--color-chart-1, #2563eb)"
                          strokeWidth={2.2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                }}
              </QueryState>
            </Panel>

            {/* Chart B: Days of Stock Cover */}
            <Panel
              title="Days of Stock Cover"
              subtitle="Estimates how many days current stock may last at the calculated demand rate."
              className="lg:col-span-2"
              actions={
                <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInventoryCoverChartView("low")}
                    className={`rounded px-2 py-0.5 font-medium transition-colors ${
                      inventoryCoverChartView === "low"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Low Cover (&lt;30d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventoryCoverChartView("excess")}
                    className={`rounded px-2 py-0.5 font-medium transition-colors ${
                      inventoryCoverChartView === "excess"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Excess (&gt;180d)
                  </button>
                </div>
              }
            >
              <QueryState q={q}>
                {(data) => {
                  const chartItems =
                    inventoryCoverChartView === "low"
                      ? data.low_cover_products && data.low_cover_products.length > 0
                        ? data.low_cover_products
                        : data.breakdown || []
                      : data.overstocked_products && data.overstocked_products.length > 0
                      ? data.overstocked_products
                      : [];

                  return (
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart data={chartItems} layout="vertical" margin={{ left: 10, right: 25, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}d`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          {...axisProps}
                          width={105}
                          tickFormatter={(v) => (v && v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                        />
                        <Tooltip
                          content={
                            <ChartTooltip
                              unit="number"
                              labelFormatter={(v) => `Product: ${v}`}
                            />
                          }
                        />
                        <Bar dataKey="value" name="Days of Cover" radius={[0, 4, 4, 0]}>
                          {chartItems.map((entry: any, index: number) => {
                            const coverVal = Number(entry.value || 0);
                            const fillColor =
                              coverVal <= 10
                                ? "var(--color-critical, #ef4444)"
                                : coverVal <= 30
                                ? "var(--color-warning, #f59e0b)"
                                : coverVal >= 180
                                ? "var(--color-chart-4, #8b5cf6)"
                                : "var(--color-chart-3, #06b6d4)";
                            return <Cell key={`cover-cell-${index}`} fill={fillColor} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                }}
              </QueryState>
            </Panel>
          </div>

          {/* 3. INVENTORY STATUS & LOGISTICS ALERTS TABLE */}
          <Panel
            title="Inventory Status & Logistics Alerts"
            subtitle="Stock levels, forward cover, and stockout risk classifications across catalog items"
          >
            <div className="space-y-4">
              {/* Controls bar: Search, quick-filter status pills, and counter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search SKU, name, or category..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>

                  {/* Quick Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryRiskFilter("all");
                        setInventoryPage(1);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        inventoryRiskFilter === "all"
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      All ({inventoryRiskCounts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryRiskFilter("stockout");
                        setInventoryPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        inventoryRiskFilter === "stockout"
                          ? "bg-critical text-white font-semibold"
                          : "bg-critical/10 text-critical hover:bg-critical/20"
                      }`}
                    >
                      Stockout Risk ({inventoryRiskCounts.stockout})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryRiskFilter("low_stock");
                        setInventoryPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        inventoryRiskFilter === "low_stock"
                          ? "bg-warning text-white font-semibold"
                          : "bg-warning/10 text-warning hover:bg-warning/20"
                      }`}
                    >
                      Low Stock ({inventoryRiskCounts.lowStock})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryRiskFilter("overstock");
                        setInventoryPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        inventoryRiskFilter === "overstock"
                          ? "bg-primary/90 text-white font-semibold"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      Overstocked ({inventoryRiskCounts.overstock})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryRiskFilter("healthy");
                        setInventoryPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        inventoryRiskFilter === "healthy"
                          ? "bg-success text-white font-semibold"
                          : "bg-success/10 text-success hover:bg-success/20"
                      }`}
                    >
                      Healthy ({inventoryRiskCounts.healthy})
                    </button>
                  </div>
                </div>

                {/* Subsets vs Total Counter */}
                <div className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {filteredInventoryRows.length === 0
                      ? 0
                      : `${(inventoryPage - 1) * inventoryPageSize + 1}–${Math.min(
                          inventoryPage * inventoryPageSize,
                          filteredInventoryRows.length
                        )}`}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">{filteredInventoryRows.length}</span> items
                  {inventoryRiskFilter !== "all" || inventorySearch.trim() ? (
                    <span className="ml-1 text-muted-foreground/80">
                      (filtered from {allInventoryRows.length} total SKUs)
                    </span>
                  ) : (
                    <span className="ml-1 text-muted-foreground/80">(all records displayed)</span>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleInventorySort("product_name")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Product</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleInventorySort("current_stock")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Available Stock</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleInventorySort("days_of_cover")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Days of Cover</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleInventorySort("avg_daily_demand")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Daily Demand</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th className="py-3 px-4 font-medium">Replenishment Lead Time</th>
                      <th className="py-3 px-4 font-medium">Risk Level</th>
                      <th className="py-3 px-4 font-medium">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                          No inventory items match the current search or status filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedInventoryRows.map((r) => {
                        const isStockout = r.risk === "stockout";
                        const isLow = r.risk === "low_stock";
                        const isOver = r.risk === "overstock";

                        return (
                          <tr
                            key={r.product_id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{r.product_name}</div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{r.product_id}</span>
                                <span>•</span>
                                <span className="rounded bg-muted px-1.5 py-0.2">{r.category}</span>
                              </div>
                            </td>
                            <td className="tabular py-3 px-4 font-medium">
                              <span className={isStockout ? "text-critical font-bold" : ""}>
                                {fmt(r.current_stock, "number")} units
                              </span>
                              {r.reorder_level > 0 && (
                                <div className="text-[11px] text-muted-foreground">ROP: {r.reorder_level}</div>
                              )}
                            </td>
                            <td className="tabular py-3 px-4 font-medium">
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                                  isStockout
                                    ? "bg-critical/15 text-critical"
                                    : isLow
                                    ? "bg-warning/15 text-warning"
                                    : isOver
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {r.days_of_cover.toFixed(1)} days
                              </span>
                            </td>
                            <td className="tabular py-3 px-4 text-muted-foreground">
                              {r.avg_daily_demand.toFixed(2)} units/day
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              <span
                                className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[11px]"
                                title="Supplier lead time is not tracked in the current database schema"
                              >
                                {r.replenishment_lead_time}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Pill tone={isStockout ? "critical" : isLow || isOver ? "warning" : "good"}>
                                {isStockout
                                  ? "Critical Stockout"
                                  : isLow
                                  ? "Low Stock Risk"
                                  : isOver
                                  ? "Overstocked"
                                  : "Healthy Stock"}
                              </Pill>
                            </td>
                            <td className="py-3 px-4 text-xs text-foreground/90">
                              <span className="font-medium">{r.suggested_action}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div>
                  Page <span className="font-medium text-foreground">{inventoryPage}</span> of{" "}
                  <span className="font-medium text-foreground">{totalInventoryPages}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    disabled={inventoryPage <= 1}
                    onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    disabled={inventoryPage >= totalInventoryPages}
                    onClick={() => setInventoryPage((p) => Math.min(totalInventoryPages, p + 1))}
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          {/* 4. INVENTORY INSIGHTS & ACTIONS */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Inventory Insights & Actions</h3>
              <p className="text-xs text-muted-foreground">
                Deterministic findings and operational next steps based on current stock levels and demand velocity.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {inventoryInsightsList.map((insight: any) => {
                const isCritical = insight.tone === "critical";
                const isWarning = insight.tone === "warning";
                const borderColor = isCritical
                  ? "border-critical/30 bg-critical/5"
                  : isWarning
                  ? "border-warning/30 bg-warning/5"
                  : "border-success/30 bg-success/5";
                const iconColor = isCritical
                  ? "text-critical"
                  : isWarning
                  ? "text-warning"
                  : "text-success";

                return (
                  <div
                    key={insight.id}
                    className={`surface rounded-lg border p-4.5 flex flex-col justify-between ${borderColor}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={`size-4 shrink-0 ${iconColor}`} />
                        <h4 className="text-sm font-semibold text-foreground">{insight.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {insight.text}
                      </p>
                    </div>
                    {insight.link && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <Link
                          to={insight.link.to}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${iconColor}`}
                        >
                          <span>{insight.link.text}</span>
                          <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MARKETING ANALYTICS                                */}
      {/* ========================================================= */}
      {section === "marketing" && (
        <div className="space-y-6">
          {/* 1. EXECUTIVE MARKETING KPIS */}
          <KpiGrid kpis={d?.kpis} />

          {/* 2. MARKETING CHARTS & VISUALIZATIONS */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart A: Attributed Revenue vs Ad Spend Over Time */}
            <Panel
              title="Attributed Revenue vs Ad Spend Over Time"
              subtitle="Daily advertising expenditure trajectory and attributed top-line sales velocity"
              className="lg:col-span-3"
              action={
                <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5 text-xs">
                  <Button
                    variant={marketingTrendMetric === "both" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setMarketingTrendMetric("both")}
                  >
                    Dual Scale
                  </Button>
                  <Button
                    variant={marketingTrendMetric === "revenue" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setMarketingTrendMetric("revenue")}
                  >
                    Revenue
                  </Button>
                  <Button
                    variant={marketingTrendMetric === "spend" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setMarketingTrendMetric("spend")}
                  >
                    Ad Spend
                  </Button>
                </div>
              }
            >
              <QueryState q={q}>
                {(data) => {
                  const trendList = data.trend || [];
                  const showRev = marketingTrendMetric === "both" || marketingTrendMetric === "revenue";
                  const showSpend = marketingTrendMetric === "both" || marketingTrendMetric === "spend";

                  return (
                    <ResponsiveContainer width="100%" height={290}>
                      <LineChart data={trendList} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                        {showRev && (
                          <YAxis
                            yAxisId="rev"
                            orientation="left"
                            width={65}
                            tickFormatter={(v) => fmt(v, "currency")}
                            {...axisProps}
                          />
                        )}
                        {showSpend && (
                          <YAxis
                            yAxisId="spend"
                            orientation={showRev ? "right" : "left"}
                            width={65}
                            tickFormatter={(v) => fmt(v, "currency")}
                            {...axisProps}
                          />
                        )}
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const pt = payload[0]?.payload || {};
                            return (
                              <div className="surface rounded-md border border-border p-2.5 shadow-md text-xs space-y-1.5 min-w-44">
                                <div className="font-semibold text-foreground border-b border-border/60 pb-1">
                                  {label ? shortDate(String(label)) : ""}
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-[var(--color-chart-1)]" />
                                    Attributed Revenue:
                                  </span>
                                  <span className="font-semibold text-foreground">
                                    {fmt(Number(pt.revenue || 0), "currency")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-[var(--color-chart-2)]" />
                                    Ad Spend:
                                  </span>
                                  <span className="font-semibold text-foreground">
                                    {fmt(Number(pt.spend || 0), "currency")}
                                  </span>
                                </div>
                                {pt.roas !== undefined && (
                                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-muted-foreground">
                                    <span>Daily ROAS:</span>
                                    <span className="font-bold text-foreground">
                                      {Number(pt.roas).toFixed(1)}x
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                        {showRev && (
                          <Line
                            yAxisId="rev"
                            type="monotone"
                            dataKey="revenue"
                            name="Attributed Revenue"
                            stroke="var(--color-chart-1)"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                        {showSpend && (
                          <Line
                            yAxisId="spend"
                            type="monotone"
                            dataKey="spend"
                            name="Ad Spend"
                            stroke="var(--color-chart-2)"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  );
                }}
              </QueryState>
            </Panel>

            {/* Chart B: Channel ROAS & Efficiency Comparison */}
            <Panel
              title={d?.breakdown_label ?? "Channel Return on Ad Spend"}
              subtitle="Efficiency multiplier by marketing channel vs 3.0x target benchmark"
              className="lg:col-span-2"
            >
              <QueryState q={q}>
                {(data) => {
                  const channelBreakdown = (data.breakdown || []).map((ch: any) => ({
                    ...ch,
                    fillColor:
                      marketingChannelFilter !== "all" &&
                      String(ch.name).toLowerCase().includes(marketingChannelFilter.toLowerCase())
                        ? "var(--color-primary)"
                        : ch.value >= 15.0
                        ? "var(--color-chart-1)"
                        : ch.value >= 6.0
                        ? "var(--color-chart-2)"
                        : "var(--color-chart-3)",
                  }));

                  return (
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart data={channelBreakdown} layout="vertical" margin={{ left: 10, right: 48, top: 24, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis
                          type="number"
                          {...axisProps}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}x`}
                        />
                        <YAxis type="category" dataKey="name" {...axisProps} width={90} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const ch = payload[0]?.payload || {};
                            return (
                              <div className="surface rounded-md border border-border p-2.5 shadow-md text-xs space-y-1.5 min-w-44">
                                <div className="font-semibold text-foreground border-b border-border/60 pb-1">
                                  {ch.name}
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span>Channel ROAS:</span>
                                  <span className="font-bold text-foreground">{Number(ch.value).toFixed(1)}x</span>
                                </div>
                                {ch.spend !== undefined && (
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Ad Spend:</span>
                                    <span>{fmt(Number(ch.spend), "currency")}</span>
                                  </div>
                                )}
                                {ch.revenue !== undefined && (
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Attributed Sales:</span>
                                    <span>{fmt(Number(ch.revenue), "currency")}</span>
                                  </div>
                                )}
                                {ch.conversions !== undefined && (
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Conversions:</span>
                                    <span>{fmt(Number(ch.conversions), "number")} orders</span>
                                  </div>
                                )}
                                {ch.cpa !== undefined && (
                                  <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
                                    <span>Acquisition CPA:</span>
                                    <span className="font-semibold text-foreground">
                                      {fmt(Number(ch.cpa), "currency")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine
                          x={3.0}
                          stroke="var(--color-warning)"
                          strokeDasharray="3 3"
                          label={(props: any) => {
                            const x = props.viewBox?.x ?? props.x;
                            const y = props.viewBox?.y ?? props.y;
                            if (x === undefined || y === undefined) return null;
                            return (
                              <text
                                x={x + 3}
                                y={y - 7}
                                fill="var(--color-warning)"
                                fontSize={10}
                                fontWeight={600}
                                textAnchor="start"
                              >
                                Target: 3.0x
                              </text>
                            );
                          }}
                        />
                        <Bar dataKey="value" name="ROAS Multiple" radius={[0, 4, 4, 0]} barSize={22}>
                          <LabelList
                            dataKey="value"
                            position="right"
                            offset={8}
                            formatter={(v: any) => `${Number(v).toFixed(1)}x`}
                            className="fill-foreground font-semibold text-[11px]"
                          />
                          {channelBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fillColor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                }}
              </QueryState>
            </Panel>
          </div>

          {/* 3. CAMPAIGN PERFORMANCE & ACTION TABLE */}
          <Panel
            title="Active Campaign & Channel Performance"
            subtitle="Ad budgets, attributed revenue, conversion velocity, efficiency status, and recommended next actions"
          >
            <div className="space-y-4">
              {/* Table Toolbar & Quick Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search input */}
                  <div className="relative min-w-[200px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns or channels..."
                      value={marketingSearch}
                      onChange={(e) => {
                        setMarketingSearch(e.target.value);
                        setMarketingPage(1);
                      }}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                    {marketingSearch && (
                      <button
                        onClick={() => setMarketingSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Channel Dropdown */}
                  <Select
                    value={marketingChannelFilter}
                    onValueChange={(val) => {
                      setMarketingChannelFilter(val);
                      setMarketingPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs bg-background">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="Search">Search</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Affiliate">Affiliate</SelectItem>
                      <SelectItem value="Display">Display</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter Buttons */}
                  <div className="flex items-center gap-1 rounded-md bg-muted/50 p-0.5 text-xs">
                    <Button
                      variant={marketingStatusFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        setMarketingStatusFilter("all");
                        setMarketingPage(1);
                      }}
                    >
                      All
                    </Button>
                    <Button
                      variant={marketingStatusFilter === "strong" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs text-success hover:text-success"
                      onClick={() => {
                        setMarketingStatusFilter("strong");
                        setMarketingPage(1);
                      }}
                    >
                      Strong Performer
                    </Button>
                    <Button
                      variant={marketingStatusFilter === "moderate" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs text-primary hover:text-primary"
                      onClick={() => {
                        setMarketingStatusFilter("moderate");
                        setMarketingPage(1);
                      }}
                    >
                      Moderate
                    </Button>
                    <Button
                      variant={marketingStatusFilter === "attention" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs text-warning hover:text-warning"
                      onClick={() => {
                        setMarketingStatusFilter("attention");
                        setMarketingPage(1);
                      }}
                    >
                      Needs Attention
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground self-center">
                  Showing <span className="font-medium text-foreground">{paginatedMarketingRows.length}</span> of{" "}
                  <span className="font-medium text-foreground">{marketingCampaignRows.length}</span> active campaigns
                </div>
              </div>

              {/* Campaign Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("roas")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Campaign / Channel</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th className="py-3 px-4 font-medium">Channel Type</th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("spend")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Ad Spend</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("revenue")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Attributed Revenue</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("roas")}
                      >
                        <div className="flex items-center gap-1">
                          <span>ROAS</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("conversions")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Orders</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer py-3 px-4 font-medium hover:text-foreground select-none"
                        onClick={() => handleMarketingSort("cost_per_acquisition")}
                      >
                        <div className="flex items-center gap-1">
                          <span>CPA</span>
                          <ArrowUpDown className="size-3 text-muted-foreground/60" />
                        </div>
                      </th>
                      <th className="py-3 px-4 font-medium">CTR</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMarketingRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                          No marketing campaigns match the current filter or search criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedMarketingRows.map((r, i) => {
                        const roasVal = Number(r.roas || 0);
                        const isStrong = r.status === "strong" || roasVal >= 15.0;
                        const isAttention = r.status === "attention" || roasVal < 6.0;

                        return (
                          <tr
                            key={r.campaign_name || r.campaign || i}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">
                                {r.campaign_name || r.campaign || "Digital Campaign"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {r.channel || "Ad Channel"}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {r.channel_category || r.channel || "Direct"}
                              </span>
                            </td>
                            <td className="tabular py-3 px-4 font-medium text-foreground">
                              {fmt(Number(r.spend || 0), "currency")}
                            </td>
                            <td className="tabular py-3 px-4 font-semibold text-foreground">
                              {fmt(Number(r.revenue || 0), "currency")}
                            </td>
                            <td className="tabular py-3 px-4">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-bold ${
                                  isStrong
                                    ? "bg-success/15 text-success"
                                    : isAttention
                                    ? "bg-warning/15 text-warning"
                                    : "bg-primary/15 text-primary"
                                }`}
                              >
                                {roasVal.toFixed(1)}x
                              </span>
                            </td>
                            <td className="tabular py-3 px-4 text-muted-foreground">
                              {r.conversions !== undefined ? fmt(Number(r.conversions), "number") : "—"}
                            </td>
                            <td className="tabular py-3 px-4 font-medium text-foreground">
                              {r.cost_per_acquisition !== undefined
                                ? fmt(Number(r.cost_per_acquisition), "currency")
                                : "—"}
                            </td>
                            <td className="tabular py-3 px-4 text-muted-foreground">
                              {r.click_through_rate_pct !== undefined
                                ? `${Number(r.click_through_rate_pct).toFixed(1)}%`
                                : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Pill tone={isStrong ? "good" : isAttention ? "warning" : "analytics"}>
                                {isStrong ? "Strong Performer" : isAttention ? "Needs Attention" : "Moderate Return"}
                              </Pill>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <span className="font-medium text-foreground/90">
                                {r.recommended_action || (isStrong ? "Scale Budget" : "Optimize Creatives")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div>
                  Page <span className="font-medium text-foreground">{marketingPage}</span> of{" "}
                  <span className="font-medium text-foreground">{totalMarketingPages}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    disabled={marketingPage <= 1}
                    onClick={() => setMarketingPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    disabled={marketingPage >= totalMarketingPages}
                    onClick={() => setMarketingPage((p) => Math.min(totalMarketingPages, p + 1))}
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          {/* 4. MARKETING INSIGHTS & RECOMMENDED ACTIONS */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Marketing Insights & Recommended Actions</h3>
              <p className="text-xs text-muted-foreground">
                Data-driven findings and high-leverage allocation actions based on active channel performance.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {marketingInsightsList.map((insight: any) => {
                const isCritical = insight.tone === "critical";
                const isWarning = insight.tone === "warning";
                const borderColor = isCritical
                  ? "border-critical/30 bg-critical/5"
                  : isWarning
                  ? "border-warning/30 bg-warning/5"
                  : "border-success/30 bg-success/5";
                const iconColor = isCritical
                  ? "text-critical"
                  : isWarning
                  ? "text-warning"
                  : "text-success";

                return (
                  <div
                    key={insight.id}
                    className={`surface rounded-lg border p-4.5 flex flex-col justify-between ${borderColor}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={`size-4 shrink-0 ${iconColor}`} />
                        <h4 className="text-sm font-semibold text-foreground">{insight.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {insight.text}
                      </p>
                    </div>
                    {insight.link && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <Link
                          to={insight.link.to}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${iconColor}`}
                        >
                          <span>{insight.link.text}</span>
                          <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
