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
      };
    case "customers":
      return { ...common,
        kpis: [
          { key: "cust", label: "Active customers", value: 2890, unit: "number", change_pct: 6.2, status: "good" },
          { key: "new", label: "New customers", value: 1120, unit: "number", change_pct: 9.4, status: "good" },
          { key: "repeat", label: "Repeat rate", value: 31.5, unit: "percent", change_pct: -1.1, status: "warning" },
          { key: "clv", label: "Avg lifetime value", value: 2380, unit: "currency", change_pct: 2.8, status: "good" },
        ],
        trend: s.map((p) => ({ date: p.date, new: Math.round(p.v / 2200), returning: Math.round(p.v / 4200) })),
        trend_keys: [{ key: "new", label: "New", unit: "number" }, { key: "returning", label: "Returning", unit: "number" }],
        breakdown: [{ name: "Champions", value: 410 }, { name: "Loyal", value: 640 }, { name: "Potential", value: 880 }, { name: "At risk", value: 520 }, { name: "Lost", value: 440 }],
        breakdown_label: "Customers by segment", breakdown_unit: "number",
        table: { columns: [{ key: "city", label: "City" }, { key: "customers", label: "Customers", unit: "number" }, { key: "revenue", label: "Revenue", unit: "currency" }], rows: [{ city: "Mumbai", customers: 640, revenue: 610000 }, { city: "Bengaluru", customers: 590, revenue: 570000 }, { city: "Delhi", customers: 520, revenue: 480000 }, { city: "Pune", customers: 310, revenue: 260000 }] },
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
  const hist = series(60, 82000, 9000);
  const out: T.TrendPoint[] = hist.map((p) => ({ date: p.date, actual: p.v }));
  let total = 0;
  for (let i = 1; i <= horizon; i++) {
    const f = wave(60 + i, 82000, 9000);
    const w = 0.05 + i * 0.004;
    total += f;
    out.push({ date: iso(i), forecast: f, lower: Math.round(f * (1 - w)), upper: Math.round(f * (1 + w)) });
  }
  const last = out[59]!;
  last.forecast = last.lower = last.upper = last.actual ?? null;
  const models: T.ModelScore[] = [
    { model: "XGBoost", mape: 6.8, rmse: 5420, r2: 0.91, selected: false },
    { model: "Random Forest", mape: 8.1, rmse: 6110, r2: 0.88, selected: false },
    { model: "ARIMA", mape: 10.4, rmse: 7350, r2: 0.82, selected: false },
    { model: "LSTM", mape: 7.5, rmse: 5790, r2: 0.89, selected: false },
  ].map((m) => ({ ...m, selected: model === "auto" ? m.model === "XGBoost" : m.model === model }));
  return {
    model: model === "auto" ? "XGBoost" : model,
    horizon_days: horizon,
    generated_at: ago(60),
    summary: `Revenue is expected to grow about 6% over the next ${horizon} days, with a dip mid-period followed by a weekend peak.`,
    series: out,
    models,
    expected_total: total,
    expected_change_pct: 6.2,
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
  { id: "h1", filename: "orders_sep_2026.csv", detected_type: "Sales orders", rows: 11820, quality_score: 91, status: "ingested", uploaded_at: ago(60 * 24 * 6) },
  { id: "h2", filename: "inventory_snapshot.xlsx", detected_type: "Inventory", rows: 48, quality_score: 97, status: "ingested", uploaded_at: ago(60 * 24 * 2) },
  { id: "h3", filename: "ad_campaigns.json", detected_type: "Marketing", rows: 312, quality_score: 74, status: "pending_review", uploaded_at: ago(60 * 5) },
];

export const reports = (): T.ReportItem[] => [
  { id: "r1", type: "Monthly business summary", from: iso(-60), to: iso(-30), created_at: ago(60 * 24 * 29), status: "ready" },
  { id: "r2", type: "Competitive pricing", from: iso(-14), to: iso(0), created_at: ago(60 * 3), status: "ready" },
];
