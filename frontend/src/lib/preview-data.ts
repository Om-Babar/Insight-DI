/**
 * Preview dataset used ONLY when VITE_API_BASE_URL is not configured.
 * Every screen shows a "Preview data" banner while this is active.
 */
import type * as T from "./types";

const day = 864e5;
const now = Date.now();
const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString().slice(0, 10);
const ago = (mins: number) => new Date(now - mins * 60000).toISOString();
const wave = (i: number, base: number, amp: number) => Math.round(base + Math.sin(i / 4) * amp + (i % 7 === 5 ? amp * 0.6 : 0) + i * (base / 300));

const series = (n: number, base: number, amp: number) => Array.from({ length: n }, (_, i) => ({ i, date: iso(i - n + 1), v: wave(i, base, amp) }));

export const recommendations = (): T.Recommendation[] => [
  { id: "rec-1", action: "Restock Wireless Earbuds Pro (400 units) within 5 days", category: "inventory", priority: "high", reason: "Current stock covers only 4 days at the forecast sales rate.", evidence: ["Forecast: 96 units/day next 14 days", "Stock on hand: 380 units", "Supplier lead time: 6 days"], expected_impact: "Protects ~₹4.2L revenue from stockouts", impact_value: 420000, confidence: 0.91, status: "open" },
  { id: "rec-2", action: "Lower Smart Watch X2 price by 6% to ₹3,749", category: "pricing", priority: "high", reason: "Amazon and Flipkart are 8–11% cheaper; conversion fell 18% this month.", evidence: ["Amazon: ₹3,699 (in stock)", "Flipkart: ₹3,799", "Conversion: 2.1% → 1.7%"], expected_impact: "+22% orders, +₹1.1L monthly profit", impact_value: 110000, confidence: 0.84, status: "open" },
  { id: "rec-3", action: "Shift 20% of ad budget from Display to Search campaigns", category: "marketing", priority: "medium", reason: "Search ROAS is 4.1x vs Display 1.6x.", evidence: ["Search ROAS 4.1x", "Display ROAS 1.6x", "Display CTR fell 30%"], expected_impact: "+₹65K revenue / month at same spend", impact_value: 65000, confidence: 0.77, status: "open" },
  { id: "rec-4", action: "Bundle Phone Cases with Screen Guards", category: "product", priority: "medium", reason: "38% of case buyers buy a guard within 7 days.", evidence: ["Co-purchase rate: 38%", "Guard margin: 61%"], expected_impact: "+6% average order value", confidence: 0.72, status: "open" },
  { id: "rec-5", action: "Clear 1,200 units of USB Hubs with a 15% promotion", category: "inventory", priority: "low", reason: "142 days of stock cover — tying up working capital.", evidence: ["Stock: 1,640 units", "Sales: 11.5 units/day"], expected_impact: "Frees ~₹2.3L working capital", confidence: 0.69, status: "open" },
];

export const overview = (): T.Overview => {
  const s = series(60, 82000, 9000);
  const trend: T.TrendPoint[] = s.map((p) => ({ date: p.date, actual: p.v }));
  for (let i = 1; i <= 14; i++) {
    const f = wave(60 + i, 82000, 9000);
    trend.push({ date: iso(i), forecast: f, lower: Math.round(f * 0.9), upper: Math.round(f * 1.1) });
  }
  trend[59]!.forecast = trend[59]!.actual ?? null;
  return {
    as_of: ago(12),
    health_summary: "Revenue is up 8.4% this month, but margin is under pressure from competitor pricing on Smart Watches and 3 products are close to stocking out.",
    kpis: [
      { key: "revenue", label: "Revenue (30d)", value: 2614000, unit: "currency", change_pct: 8.4, status: "good" },
      { key: "orders", label: "Orders (30d)", value: 3482, unit: "number", change_pct: 5.1, status: "good" },
      { key: "margin", label: "Profit margin", value: 21.6, unit: "percent", change_pct: -2.3, status: "warning", hint: "Down from 23.9% last month" },
      { key: "inventory", label: "Products at stock risk", value: 3, unit: "number", change_pct: 50, status: "critical", hint: "Could stock out within 7 days" },
    ],
    alerts: [
      { id: "a1", severity: "critical", title: "Wireless Earbuds Pro will stock out in ~4 days", detail: "Forecast demand exceeds stock on hand.", link: "/recommendations", created_at: ago(40) },
      { id: "a2", severity: "warning", title: "Smart Watch X2 is 9% pricier than Amazon", detail: "Conversion dropped 18% in 2 weeks.", link: "/competition", created_at: ago(90) },
      { id: "a3", severity: "positive", title: "Bluetooth Speakers beat forecast by 14%", detail: "Search campaign driving demand.", link: "/analytics", created_at: ago(300) },
    ],
    revenue_trend: trend,
    top_products: [
      { sku: "EB-PRO", name: "Wireless Earbuds Pro", category: "Audio", revenue: 612000, units: 2040, margin_pct: 28, change_pct: 19 },
      { sku: "BS-MINI", name: "Bluetooth Speaker Mini", category: "Audio", revenue: 401000, units: 1610, margin_pct: 31, change_pct: 14 },
      { sku: "SW-X2", name: "Smart Watch X2", category: "Wearables", revenue: 356000, units: 89, margin_pct: 17, change_pct: -12 },
    ],
    bottom_products: [
      { sku: "USB-HUB", name: "USB-C Hub 7-in-1", category: "Accessories", revenue: 38000, units: 345, margin_pct: 22, change_pct: -24 },
      { sku: "CBL-3M", name: "Braided Cable 3m", category: "Accessories", revenue: 29000, units: 970, margin_pct: 40, change_pct: -9 },
      { sku: "STD-LT", name: "Laptop Stand", category: "Accessories", revenue: 21000, units: 70, margin_pct: 35, change_pct: -15 },
    ],
    inventory_alerts: [
      { sku: "EB-PRO", name: "Wireless Earbuds Pro", stock: 380, days_of_cover: 4, risk: "stockout" },
      { sku: "PC-15", name: "Phone Case 15", stock: 210, days_of_cover: 6, risk: "stockout" },
      { sku: "SG-15", name: "Screen Guard 15", stock: 150, days_of_cover: 7, risk: "stockout" },
      { sku: "USB-HUB", name: "USB-C Hub 7-in-1", stock: 1640, days_of_cover: 142, risk: "overstock" },
    ],
    competitive_summary: { cheaper: 7, matched: 5, pricier: 4, last_collected: ago(35) },
    top_recommendations: recommendations().slice(0, 3),
  };
};

export const analytics = (section: T.AnalyticsSection): T.AnalyticsData => {
  const s = series(30, 85000, 9000);
  const common = { section };
  switch (section) {
    case "sales":
      return { ...common,
        kpis: [
          { key: "rev", label: "Revenue", value: 2614000, unit: "currency", change_pct: 8.4, status: "good" },
          { key: "ord", label: "Orders", value: 3482, unit: "number", change_pct: 5.1, status: "good" },
          { key: "aov", label: "Avg order value", value: 751, unit: "currency", change_pct: 3.1, status: "good" },
          { key: "ret", label: "Return rate", value: 4.2, unit: "percent", change_pct: 0.6, status: "warning" },
        ],
        trend: s.map((p) => ({ date: p.date, revenue: p.v, orders: Math.round(p.v / 750) })),
        trend_keys: [{ key: "revenue", label: "Revenue", unit: "currency" }, { key: "orders", label: "Orders", unit: "number" }],
        breakdown: [{ name: "Audio", value: 1180000 }, { name: "Wearables", value: 720000 }, { name: "Accessories", value: 410000 }, { name: "Mobile", value: 304000 }],
        breakdown_label: "Revenue by category", breakdown_unit: "currency",
        table: { columns: [{ key: "channel", label: "Channel" }, { key: "revenue", label: "Revenue", unit: "currency" }, { key: "orders", label: "Orders", unit: "number" }, { key: "growth", label: "Growth", unit: "percent" }],
          rows: [{ channel: "Own website", revenue: 1240000, orders: 1610, growth: 11.2 }, { channel: "Amazon seller", revenue: 860000, orders: 1190, growth: 4.8 }, { channel: "Flipkart seller", revenue: 514000, orders: 682, growth: 6.1 }] },
      };
    case "products":
      return { ...common,
        kpis: [
          { key: "active", label: "Active products", value: 48, unit: "number", change_pct: 4, status: "good" },
          { key: "margin", label: "Avg margin", value: 26.3, unit: "percent", change_pct: -1.4, status: "warning" },
          { key: "top", label: "Top 5 share of revenue", value: 62, unit: "percent", change_pct: 2.2, status: "warning" },
          { key: "declining", label: "Declining products", value: 9, unit: "number", change_pct: 12, status: "critical" },
        ],
        trend: s.map((p) => ({ date: p.date, audio: Math.round(p.v * 0.45), wearables: Math.round(p.v * 0.28), accessories: Math.round(p.v * 0.16) })),
        trend_keys: [{ key: "audio", label: "Audio", unit: "currency" }, { key: "wearables", label: "Wearables", unit: "currency" }, { key: "accessories", label: "Accessories", unit: "currency" }],
        breakdown: overview().top_products.concat(overview().bottom_products).map((p) => ({ name: p.name, value: p.margin_pct })),
        breakdown_label: "Profit margin by product", breakdown_unit: "percent",
        table: { columns: [{ key: "name", label: "Product" }, { key: "category", label: "Category" }, { key: "revenue", label: "Revenue", unit: "currency" }, { key: "units", label: "Units", unit: "number" }, { key: "margin_pct", label: "Margin", unit: "percent" }, { key: "change_pct", label: "Change", unit: "percent" }],
          rows: overview().top_products.concat(overview().bottom_products) as unknown as Record<string, string | number>[] },
        all_products: [
          { product_id: "EB-PRO", product_name: "Wireless Earbuds Pro", category: "Audio", revenue: 612000, units_sold: 2040, profit_margin_pct: 28.0, change_pct: 19.0, current_stock: 380, cost_price: 1799, selling_price: 2499, stock_status: "In Stock" },
          { product_id: "BS-MINI", product_name: "Bluetooth Speaker Mini", category: "Audio", revenue: 401000, units_sold: 1610, profit_margin_pct: 31.0, change_pct: 14.0, current_stock: 520, cost_price: 1249, selling_price: 1799, stock_status: "In Stock" },
          { product_id: "SW-X2", product_name: "Smart Watch X2", category: "Wearables", revenue: 356000, units_sold: 89, profit_margin_pct: 17.0, change_pct: -12.0, current_stock: 210, cost_price: 3319, selling_price: 3999, stock_status: "In Stock" },
          { product_id: "PD-65W", product_name: "Fast Wall Charger 65W", category: "Accessories", revenue: 322000, units_sold: 1610, profit_margin_pct: 38.0, change_pct: 18.0, current_stock: 450, cost_price: 1239, selling_price: 1999, stock_status: "In Stock" },
          { product_id: "FB-PRO", product_name: "Fitness Band Pulse", category: "Wearables", revenue: 244000, units_sold: 976, profit_margin_pct: 26.0, change_pct: 11.0, current_stock: 340, cost_price: 1849, selling_price: 2499, stock_status: "In Stock" },
          { product_id: "PC-15", product_name: "Impact Phone Case 15", category: "Mobile", revenue: 184000, units_sold: 3680, profit_margin_pct: 42.0, change_pct: 15.4, current_stock: 210, cost_price: 289, selling_price: 499, stock_status: "In Stock" },
          { product_id: "HP-ANC", product_name: "Over-Ear ANC Headphones", category: "Audio", revenue: 167000, units_sold: 334, profit_margin_pct: 34.0, change_pct: 8.5, current_stock: 140, cost_price: 3299, selling_price: 4999, stock_status: "In Stock" },
          { product_id: "SW-STR", product_name: "Silicone Replacement Straps", category: "Wearables", revenue: 120000, units_sold: 2400, profit_margin_pct: 45.0, change_pct: 6.2, current_stock: 850, cost_price: 274, selling_price: 499, stock_status: "In Stock" },
          { product_id: "SG-15", product_name: "Tempered Screen Guard 15", category: "Mobile", revenue: 120000, units_sold: 4000, profit_margin_pct: 55.0, change_pct: 22.1, current_stock: 150, cost_price: 89, selling_price: 199, stock_status: "In Stock" },
          { product_id: "USB-HUB", product_name: "USB-C Hub 7-in-1", category: "Accessories", revenue: 38000, units_sold: 345, profit_margin_pct: 22.0, change_pct: -24.0, current_stock: 1640, cost_price: 779, selling_price: 999, stock_status: "In Stock" },
          { product_id: "CBL-3M", product_name: "Braided Cable 3m", category: "Accessories", revenue: 29000, units_sold: 970, profit_margin_pct: 40.0, change_pct: -9.0, current_stock: 920, cost_price: 179, selling_price: 299, stock_status: "In Stock" },
          { product_id: "STD-LT", product_name: "Aluminum Laptop Stand", category: "Accessories", revenue: 21000, units_sold: 70, profit_margin_pct: 35.0, change_pct: -15.0, current_stock: 310, cost_price: 974, selling_price: 1499, stock_status: "In Stock" },
        ],
      };
    case "customers":
      return { ...common,
        kpis: [
          { key: "cust", label: "Active Customers", value: 3960, unit: "number", change_pct: 0.5, status: "good", is_pp: false, comparison_label: "vs last period", hint: "3,960 distinct buyers in selected period", tooltip: "Distinct customers who placed at least one completed order during the selected time period." },
          { key: "new", label: "New Customers", value: 41, unit: "number", change_pct: 12.5, status: "good", is_pp: false, comparison_label: "vs last period", hint: "First-time buyers making their first order in period", tooltip: "First-time customers whose very first completed purchase on InsightDI occurred during this selected period." },
          { key: "repeat", label: "Repeat Purchase Rate", value: 63.8, unit: "percent", change_pct: 2.4, status: "good", is_pp: true, comparison_label: "vs last period", hint: "2,527 of 3,960 active buyers placed multiple orders", tooltip: "Percentage of active customers in this period who placed two or more completed orders during the timeframe." },
          { key: "clv", label: "Avg Customer Lifetime Value", value: 60675, unit: "currency", change_pct: -1.5, status: "warning", is_pp: false, comparison_label: "vs last period", hint: "Cumulative lifetime spend per active buyer", tooltip: "Average cumulative revenue generated per customer across their entire purchase history on InsightDI." },
        ],
        trend: s.map((p) => ({ date: p.date, new: Math.round(p.v / 2200), returning: Math.round(p.v / 4200), total: Math.round(p.v / 2200) + Math.round(p.v / 4200) })),
        trend_keys: [{ key: "new", label: "New Customers", unit: "number" }, { key: "returning", label: "Returning Customers", unit: "number" }],
        breakdown: [
          { name: "Loyal", value: 768, active_customers: 705, revenue: 8422251, revenue_share_pct: 29.2, orders: 2161, aov: 3897, definition: "Consistent repeat purchasers with dependable order cadence." },
          { name: "Lost", value: 1766, active_customers: 1335, revenue: 6825699, revenue_share_pct: 23.7, orders: 2590, aov: 2635, definition: "Price-sensitive and lapsed shoppers requiring re-activation." },
          { name: "Potential", value: 1436, active_customers: 1153, revenue: 6630653, revenue_share_pct: 23.0, orders: 2309, aov: 2871, definition: "Regular recent shoppers with above-average basket sizes." },
          { name: "Champions", value: 429, active_customers: 394, revenue: 5364645, revenue_share_pct: 18.6, orders: 1238, aov: 4333, definition: "High spend and high frequency shoppers with peak lifetime value." },
          { name: "At Risk", value: 610, active_customers: 373, revenue: 1579419, revenue_share_pct: 5.5, orders: 583, aov: 2709, definition: "Infrequent past buyers who have not purchased in recent cycles." },
        ],
        breakdown_label: "Customers by Segment",
        breakdown_unit: "number",
        table: {
          columns: [
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "customers", label: "Customers", unit: "number" },
            { key: "orders", label: "Orders", unit: "number" },
            { key: "revenue", label: "Revenue", unit: "currency" },
            { key: "rev_per_customer", label: "Rev / Customer", unit: "currency" },
            { key: "growth_pct", label: "Growth", unit: "percent" },
          ],
          rows: [
            { city: "Hyderabad", state: "Telangana", customers: 209, orders: 474, revenue: 1549464, rev_per_customer: 7414, growth_pct: 12.7 },
            { city: "Delhi", state: "Delhi", customers: 184, orders: 417, revenue: 1456820, rev_per_customer: 7918, growth_pct: 14.4 },
            { city: "Chennai", state: "Tamil Nadu", customers: 195, orders: 386, revenue: 1353860, rev_per_customer: 6943, growth_pct: -5.9 },
            { city: "Bengaluru", state: "Karnataka", customers: 181, orders: 411, revenue: 1302954, rev_per_customer: 7199, growth_pct: -19.3 },
            { city: "Pune", state: "Maharashtra", customers: 187, orders: 436, revenue: 1291434, rev_per_customer: 6906, growth_pct: 11.0 },
            { city: "Mumbai", state: "Maharashtra", customers: 167, orders: 383, revenue: 1284280, rev_per_customer: 7690, growth_pct: 11.9 },
            { city: "Kolkata", state: "West Bengal", customers: 191, orders: 394, revenue: 1288955, rev_per_customer: 6748, growth_pct: 7.2 },
            { city: "Ahmedabad", state: "Gujarat", customers: 191, orders: 407, revenue: 1198792, rev_per_customer: 6276, growth_pct: -6.8 },
            { city: "Chandigarh", state: "Punjab", customers: 129, orders: 330, revenue: 1077903, rev_per_customer: 8356, growth_pct: 15.6 },
            { city: "Lucknow", state: "Uttar Pradesh", customers: 143, orders: 312, revenue: 1059338, rev_per_customer: 7408, growth_pct: 7.8 },
          ],
        },
        customer_insights: [
          {
            id: "cust-insight-1",
            title: "Strong Customer Repurchase Stickiness",
            text: "Repeat purchase rate reached 63.8% (+2.4 pp vs last period). 2,527 of 3,960 active buyers placed 2+ orders in this period, strengthening customer retention.",
            tone: "good",
            link: { text: "Explore Root Cause", to: "/root-cause?metric=retention" },
          },
          {
            id: "cust-insight-2",
            title: "High-Value Segment Concentration & Churn Defense",
            text: "Loyal accounts for 29.2% of revenue (₹8,422,251). Meanwhile, 373 At-Risk customers generated ₹1,579,419, representing a win-back opportunity via loyalty incentives.",
            tone: "analytics",
            link: { text: "View Recommendations", to: "/recommendations?segment=retention" },
          },
          {
            id: "cust-insight-3",
            title: "Regional Revenue Engine & Growth Expansion",
            text: "Hyderabad (Telangana) leads overall customer revenue with ₹1,549,464 (209 active buyers). Ranchi exhibited highest momentum with +31.3% period-over-period expansion.",
            tone: "good",
            link: { text: "Simulate Growth", to: "/simulation?scenario=growth" },
          },
        ],
      };
    case "inventory":
      return { ...common,
        kpis: [
          { key: "val", label: "Stock value", value: 4120000, unit: "currency", change_pct: -3.2, status: "good" },
          { key: "turn", label: "Inventory turnover", value: 5.8, unit: "number", change_pct: 0.4, status: "good" },
          { key: "risk", label: "Stockout risks", value: 3, unit: "number", change_pct: 50, status: "critical" },
          { key: "over", label: "Overstocked items", value: 5, unit: "number", change_pct: -1, status: "warning" },
        ],
        trend: s.map((p) => ({ date: p.date, stock_units: 9000 - p.i * 40 + (p.i % 10 === 0 ? 800 : 0) })),
        trend_keys: [{ key: "stock_units", label: "Units in stock", unit: "number" }],
        breakdown: overview().inventory_alerts.map((a) => ({ name: a.name, value: a.days_of_cover })),
        breakdown_label: "Days of stock cover", breakdown_unit: "number",
        table: { columns: [{ key: "name", label: "Product" }, { key: "stock", label: "Stock", unit: "number" }, { key: "days_of_cover", label: "Days of cover", unit: "number" }, { key: "risk", label: "Risk" }],
          rows: overview().inventory_alerts as unknown as Record<string, string | number>[] },
      };
    case "marketing":
      return { ...common,
        kpis: [
          { key: "spend", label: "Ad spend", value: 312000, unit: "currency", change_pct: 4.0, status: "good" },
          { key: "roas", label: "ROAS", value: 3.2, unit: "number", change_pct: -0.3, status: "warning" },
          { key: "cac", label: "Cost per customer", value: 279, unit: "currency", change_pct: 6.1, status: "warning" },
          { key: "ctr", label: "Click-through rate", value: 2.4, unit: "percent", change_pct: -0.2, status: "warning" },
        ],
        trend: s.map((p) => ({ date: p.date, spend: Math.round(p.v / 8.5), revenue: p.v })),
        trend_keys: [{ key: "revenue", label: "Attributed revenue", unit: "currency" }, { key: "spend", label: "Ad spend", unit: "currency" }],
        breakdown: [{ name: "Google Search", value: 4.1 }, { name: "Instagram", value: 2.9 }, { name: "Amazon Ads", value: 3.4 }, { name: "Display", value: 1.6 }],
        breakdown_label: "Return on ad spend by channel (x)", breakdown_unit: "number",
        table: { columns: [{ key: "campaign", label: "Campaign" }, { key: "spend", label: "Spend", unit: "currency" }, { key: "revenue", label: "Revenue", unit: "currency" }, { key: "roas", label: "ROAS", unit: "number" }],
          rows: [{ campaign: "Festive Audio Search", spend: 92000, revenue: 377000, roas: 4.1 }, { campaign: "Wearables Reels", spend: 71000, revenue: 206000, roas: 2.9 }, { campaign: "Display Retargeting", spend: 64000, revenue: 102000, roas: 1.6 }] },
      };
  }
};

export const forecast = (horizon: number, model: string): T.ForecastData => {
  // Canonical dataset anchor: ends 2024-12-31
  const baseEnd = new Date("2024-12-31T00:00:00Z");
  const histDays = 60;
  const out: T.TrendPoint[] = [];

  for (let i = histDays - 1; i >= 0; i--) {
    const d = new Date(baseEnd.getTime() - i * day);
    const dateStr = d.toISOString().slice(0, 10);
    const val = wave(histDays - i, 82000, 9000);
    out.push({ date: dateStr, actual: val });
  }

  let total = 0;
  let lowerTotal = 0;
  let upperTotal = 0;
  const weekendVals: number[] = [];
  const weekdayVals: number[] = [];

  for (let i = 1; i <= horizon; i++) {
    const d = new Date(baseEnd.getTime() + i * day);
    const dateStr = d.toISOString().slice(0, 10);
    const f = wave(histDays + i, 82000, 9000);
    const w = 0.08 + i * 0.003;
    const l = Math.max(10000, Math.round(f * (1 - w)));
    const u = Math.round(f * (1 + w));
    total += f;
    lowerTotal += l;
    upperTotal += u;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) {
      weekendVals.push(f);
    } else {
      weekdayVals.push(f);
    }
    out.push({ date: dateStr, forecast: f, lower: l, upper: u });
  }

  const prevStart = new Date(baseEnd.getTime() - (horizon - 1) * day).toISOString().slice(0, 10);
  const prevEnd = "2024-12-31";
  const forecastStart = new Date(baseEnd.getTime() + 1 * day).toISOString().slice(0, 10);
  const forecastEnd = new Date(baseEnd.getTime() + horizon * day).toISOString().slice(0, 10);

  const models: T.ModelScore[] = [
    { model: "XGBoost Regressor", mape: 6.8, rmse: 5420, r2: 0.91, mae: 4210, test_days: 74, selected: false },
    { model: "Random Forest Regressor", mape: 8.1, rmse: 6110, r2: 0.88, mae: 5040, test_days: 74, selected: false },
    { model: "ARIMA (1,1,1)", mape: 10.4, rmse: 7350, r2: 0.82, mae: 6480, test_days: 74, selected: false },
  ].map((m) => ({ ...m, selected: model === "auto" ? m.model.includes("XGBoost") : m.model.toLowerCase().includes(model.toLowerCase()) }));

  const prevTotal = Math.round(total / 1.042);
  const changeAbs = total - prevTotal;
  const changePct = 4.2;

  const wAvg = weekendVals.length ? Math.round(weekendVals.reduce((a, b) => a + b, 0) / weekendVals.length) : 0;
  const dAvg = weekdayVals.length ? Math.round(weekdayVals.reduce((a, b) => a + b, 0) / weekdayVals.length) : 0;
  const wLift = dAvg > 0 ? Number((((wAvg - dAvg) / dAvg) * 100).toFixed(1)) : 0;

  const insights: T.ForecastInsight[] = [
    {
      category: "trajectory",
      title: "Projected Revenue Expansion (+4.2%)",
      description: `Revenue is projected to reach ₹${total.toLocaleString("en-IN")} over the upcoming ${horizon}-day period (${forecastStart} to ${forecastEnd}), an expected increase of ₹${changeAbs.toLocaleString("en-IN")} (+${changePct.toFixed(1)}%) versus the prior ${horizon}-day baseline (${prevStart} to ${prevEnd}, ₹${prevTotal.toLocaleString("en-IN")}). Estimated run-rate paces at ₹${Math.round(total / horizon).toLocaleString("en-IN")}/day.`,
      tone: "positive",
    },
    {
      category: "pattern",
      title: "Intra-Week Variation & Projected Peak Days",
      description: `Model predictions reflect intra-week demand variations: projected weekend daily revenue averages ₹${wAvg.toLocaleString("en-IN")} (${wLift >= 0 ? "+" : ""}${wLift}% compared to weekday average of ₹${dAvg.toLocaleString("en-IN")}/day).`,
      tone: "info",
    },
    {
      category: "implication",
      title: "Inventory & Operational Readiness Review",
      description: "Higher projected order activity around weekend dates indicates peak warehouse dispatch demand. Business owners should prudently review catalog stock coverage in Business Analytics → Inventory without making stockout assumptions solely from top-level revenue forecasts.",
      action_label: "Review Inventory Status",
      action_route: "/analytics?tab=inventory",
      tone: "neutral",
    },
    {
      category: "action",
      title: "Scenario Testing & Revenue Driver Diagnostics",
      description: "To test how pricing adjustments or marketing spend variations could alter this baseline revenue projection, run What-If Simulation. To investigate historical factors behind past performance, inspect Root Cause Analysis.",
      action_label: "Run What-If Simulation",
      action_route: "/simulation",
      tone: "info",
    },
  ];

  return {
    model: model === "auto" ? "XGBoost Regressor" : model,
    horizon_days: horizon,
    generated_at: new Date().toISOString(),
    data_freshness_date: "2024-12-31",
    latest_actual_date: "2024-12-31",
    forecast_start_date: forecastStart,
    forecast_end_date: forecastEnd,
    previous_period_start_date: prevStart,
    previous_period_end_date: prevEnd,
    is_data_stale: true,
    data_stale_days: Math.floor((Date.now() - baseEnd.getTime()) / day),
    summary: `Projected revenue of ₹${total.toLocaleString("en-IN")} over the upcoming ${horizon} days (${forecastStart} to ${forecastEnd}).`,
    series: out,
    models,
    expected_total: total,
    expected_change_pct: changePct,
    expected_change_abs: changeAbs,
    previous_period_revenue: prevTotal,
    total_lower_bound: lowerTotal,
    total_upper_bound: upperTotal,
    insights,
    historical_start_date: out[0]?.date,
  };
};

export const competition = (): T.CompetitionData => {
  const mk = (sku: string, name: string, ours: number, amz: number, fk: number, pos: T.CompetitorProduct["position"]): T.CompetitorProduct => ({
    sku, name, our_price: ours, our_discount_pct: 10, our_rating: 4.3, our_reviews: 820, our_availability: "in_stock", position: pos,
    listings: [
      { platform: "amazon", price: amz, discount_pct: 18, rating: 4.4, reviews: 12840, availability: "in_stock", match_confidence: 0.96, collected_at: ago(35), status: "fresh" },
      { platform: "flipkart", price: fk, discount_pct: 14, rating: 4.2, reviews: 6210, availability: sku === "BS-MINI" ? "out_of_stock" : "in_stock", match_confidence: 0.88, collected_at: ago(38), status: "fresh" },
    ],
    price_history: Array.from({ length: 21 }, (_, i) => ({ date: iso(i - 20), ours, amazon: Math.round(amz * (1 + Math.sin(i / 3) * 0.03)), flipkart: Math.round(fk * (1 + Math.cos(i / 4) * 0.025)) })),
  });
  return {
    last_collected: ago(35),
    sources: [
      { platform: "Amazon.in", status: "fresh", last_collected: ago(35), products: 16 },
      { platform: "Flipkart", status: "fresh", last_collected: ago(38), products: 15 },
    ],
    products: [
      mk("SW-X2", "Smart Watch X2", 3999, 3699, 3799, "overpriced"),
      mk("EB-PRO", "Wireless Earbuds Pro", 2499, 2599, 2549, "cheapest"),
      mk("BS-MINI", "Bluetooth Speaker Mini", 1799, 1849, 1899, "cheapest"),
      mk("PC-15", "Phone Case 15", 499, 489, 519, "competitive"),
    ],
    alerts: [
      { id: "c1", severity: "warning", title: "Amazon dropped Smart Watch X2 price by 7%", detail: "You are now 8% more expensive.", created_at: ago(120) },
      { id: "c2", severity: "positive", title: "Bluetooth Speaker Mini is out of stock on Flipkart", detail: "Opportunity to capture demand — consider a small ad boost.", created_at: ago(200) },
    ],
  };
};

export const rca = (): T.RcaData => {
  const s = series(30, 380, 40);
  return {
    problem: { title: "Smart Watch X2 sales dropped 18%", metric: "Weekly orders", change_pct: -18, period: "Last 14 days vs previous 14 days", summary: "Orders fell mainly because competitors became cheaper, while ad visibility also declined." },
    main_cause: { factor: "Competitor price gap", contribution_pct: 52, explanation: "Amazon and Flipkart cut prices by 7–9%, making our listing the most expensive option." },
    factors: [
      { factor: "Competitor price gap", contribution_pct: 52, direction: "negative", explanation: "Our price is 8% above Amazon." },
      { factor: "Lower ad impressions", contribution_pct: 24, direction: "negative", explanation: "Display budget was reduced by 30%." },
      { factor: "Rating dip", contribution_pct: 14, direction: "negative", explanation: "Rating fell from 4.5 to 4.3 after 12 negative reviews." },
      { factor: "Seasonality", contribution_pct: 10, direction: "negative", explanation: "Post-festive period usually slows wearables." },
    ],
    waterfall: [{ name: "Previous", value: 1000 }, { name: "Price gap", value: -94 }, { name: "Ads", value: -43 }, { name: "Rating", value: -25 }, { name: "Season", value: -18 }, { name: "Current", value: 820 }],
    anomalies: s.map((p) => {
      const drop = p.i > 18 ? 0.8 : 1;
      const v = Math.round(p.v * drop);
      return { date: p.date, value: v, expected: p.v, anomaly: p.i > 20 && p.i % 2 === 0 };
    }),
    shap: [
      { feature: "price_gap_vs_amazon", importance: 0.41 }, { feature: "ad_impressions", importance: 0.19 }, { feature: "avg_rating", importance: 0.11 },
      { feature: "day_of_week", importance: 0.09 }, { feature: "discount_pct", importance: 0.08 }, { feature: "stock_level", importance: 0.05 },
    ],
    model_info: { model: "XGBoost + TreeSHAP", samples: 18420, r2: 0.87 },
  };
};

export const simulate = (inp: T.SimulationInput): T.SimulationResult => {
  const base: T.SimulationInput = { ad_spend: 300000, price: 3999, discount_pct: 10, restock_units: 500 };
  const calc = (x: T.SimulationInput): T.SimulationMetrics => {
    const eff = x.price * (1 - x.discount_pct / 100);
    const demand = 900 * Math.pow(eff / 3599, -1.6) * Math.pow(x.ad_spend / 300000, 0.35);
    const stock = 400 + x.restock_units;
    const orders = Math.round(Math.min(demand, stock));
    const revenue = orders * eff;
    const profit = revenue - orders * 2600 - x.ad_spend * 0.15;
    const so = Math.max(0.02, Math.min(0.98, (demand - stock * 0.85) / (stock * 0.5) + 0.1));
    return { orders, revenue: Math.round(revenue), profit: Math.round(profit), stockout_probability: Math.round(so * 100) / 100 };
  };
  const b = calc(base), s = calc(inp);
  return {
    baseline_input: base, baseline: b, simulated: s,
    impact: [{ name: "Baseline profit", value: b.profit }, { name: "Price & discount", value: Math.round((s.profit - b.profit) * 0.6) }, { name: "Ad spend", value: Math.round((s.profit - b.profit) * 0.3) }, { name: "Stock", value: Math.round((s.profit - b.profit) * 0.1) }, { name: "Simulated profit", value: s.profit }],
    notes: [s.stockout_probability > 0.4 ? "High stockout risk — increase restock units." : "Stock level is sufficient for expected demand.", s.profit > b.profit ? "This scenario improves profit." : "This scenario reduces profit versus today."],
  };
};

export const copilot = (q: string): T.CopilotAnswer => {
  const l = q.toLowerCase();
  if (l.includes("compet") || l.includes("amazon") || l.includes("price"))
    return { answer: "You are more expensive than Amazon and Flipkart on 4 of 16 tracked products. The biggest gap is Smart Watch X2 (8% above Amazon), which coincides with an 18% drop in its orders.", highlights: [{ label: "Pricier than market", value: "4 products", tone: "warning" }, { label: "Largest gap", value: "Smart Watch X2 +8%", tone: "critical" }], next_steps: [{ label: "Open Competitive Intelligence", to: "/competition" }, { label: "Simulate a price cut", to: "/simulation" }], sources: ["internal", "competitor"] };
  if (l.includes("forecast") || l.includes("next"))
    return { answer: "Revenue is forecast to grow ~6% over the next 30 days. Expect a mid-month dip and a weekend peak. Earbuds demand will exceed current stock in about 4 days.", highlights: [{ label: "Expected growth", value: "+6.2%", tone: "good" }, { label: "Stockout risk", value: "Earbuds Pro", tone: "critical" }], next_steps: [{ label: "View forecast", to: "/forecasting" }], sources: ["internal"] };
  if (l.includes("why") || l.includes("drop"))
    return { answer: "Smart Watch X2 orders fell 18%. 52% of the drop is explained by competitor pricing, 24% by fewer ad impressions, and the rest by a rating dip and seasonality.", highlights: [{ label: "Main cause", value: "Competitor price gap (52%)", tone: "critical" }], next_steps: [{ label: "Open Root Cause Analysis", to: "/root-cause" }, { label: "See recommendations", to: "/recommendations" }], sources: ["internal", "competitor"] };
  return { answer: "This month revenue is ₹26.1L (+8.4%) from 3,482 orders. Margin slipped to 21.6% due to competitor pricing pressure. Three products need restocking this week.", highlights: [{ label: "Revenue", value: "₹26.1L (+8.4%)", tone: "good" }, { label: "Margin", value: "21.6% (−2.3 pts)", tone: "warning" }], next_steps: [{ label: "See recommendations", to: "/recommendations" }], sources: ["internal", "external"] };
};

export const profile = (file: File): T.DatasetProfile => ({
  id: `ds-${Date.now()}`,
  filename: file.name,
  rows: 12480,
  columns: 9,
  detected_type: "Sales orders",
  type_confidence: 0.94,
  quality_score: 82,
  target_fields: ["order_id", "order_date", "sku", "quantity", "unit_price", "customer_id", "city", "channel", "discount"],
  mapping: [
    { source_column: "Order No", target_field: "order_id", confidence: 0.98, sample: "ORD-10293" },
    { source_column: "Date", target_field: "order_date", confidence: 0.97, sample: "2026-09-14" },
    { source_column: "Product Code", target_field: "sku", confidence: 0.92, sample: "EB-PRO" },
    { source_column: "Qty", target_field: "quantity", confidence: 0.95, sample: "2" },
    { source_column: "Price (INR)", target_field: "unit_price", confidence: 0.9, sample: "2499" },
    { source_column: "Cust", target_field: "customer_id", confidence: 0.71, sample: "C-8812" },
    { source_column: "Location", target_field: "city", confidence: 0.64, sample: "Pune" },
    { source_column: "Source", target_field: "channel", confidence: 0.58, sample: "web" },
    { source_column: "Promo", target_field: null, confidence: 0.32, sample: "FEST10" },
  ],
  issues: [
    { kind: "missing", column: "Location", count: 214, detail: "214 rows have no city.", fix: "Fill with 'Unknown'" },
    { kind: "duplicate", count: 37, detail: "37 duplicate orders found.", fix: "Remove duplicate rows" },
    { kind: "invalid", column: "Qty", count: 9, detail: "9 rows have negative quantity.", fix: "Treat as returns" },
    { kind: "relationship", column: "Product Code", count: 12, detail: "12 SKUs not found in product catalog.", fix: "Flag for review" },
  ],
});

export const history = (): T.UploadHistoryItem[] => [
  { id: "h1", filename: "orders_sep_2026.csv", detected_type: "Sales / Orders", rows: 11820, quality_score: 91, status: "ingested", uploaded_at: ago(60 * 24 * 6), data_coverage: "1 Sep – 30 Sep 2026", last_processed_at: ago(60 * 24 * 6 - 5), impact_modules: ["Business Analytics", "Forecasting", "RCA", "Recommendations"] },
  { id: "h2", filename: "inventory_snapshot.xlsx", detected_type: "Inventory", rows: 48, quality_score: 97, status: "ingested", uploaded_at: ago(60 * 24 * 2), data_coverage: "Current Stock · Oct 2026", last_processed_at: ago(60 * 24 * 2 - 3), impact_modules: ["Business Analytics", "Forecasting", "What-If Simulation"] },
  { id: "h3", filename: "ad_campaigns.json", detected_type: "Marketing", rows: 312, quality_score: 74, status: "pending_review", uploaded_at: ago(60 * 5), data_coverage: "15 Aug – 5 Oct 2026", last_processed_at: ago(60 * 4), impact_modules: ["Business Analytics", "RCA"] },
  { id: "h4", filename: "imdb_movies_top100.csv", detected_type: "Unsupported", rows: 1450, quality_score: 18, status: "rejected", uploaded_at: ago(60 * 24 * 1), data_coverage: "N/A", last_processed_at: ago(60 * 24 * 1), rejection_reason: "Dataset rejected: No supported E-commerce business structure detected." },
];

export const reports = (): T.ReportItem[] => [
  { id: "r1", type: "Monthly business summary", from: iso(-60), to: iso(-30), created_at: ago(60 * 24 * 29), status: "ready" },
  { id: "r2", type: "Competitive pricing", from: iso(-14), to: iso(0), created_at: ago(60 * 3), status: "ready" },
];
