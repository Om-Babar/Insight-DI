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
          { key: "stock_value", label: "Stock Value", value: 47064905.2, unit: "currency", change_pct: 2.0, status: "good", hint: "At cost price (₹4.71 Cr cost)", tooltip: "Shows the total value of inventory currently held by your business at cost price." },
          { key: "inventory_turnover", label: "Inventory Turnover", value: 5.9, unit: "number", change_pct: 1.87, status: "good", hint: "5.9x annualized (0.49x in 30d period)", tooltip: "Shows how frequently your inventory is sold and replenished during the reporting period." },
          { key: "stockout_risks", label: "Stockout Risks", value: 3, unit: "number", change_pct: 50.0, status: "critical", hint: "3 products at or below safety reorder level", tooltip: "Products that may run out of stock before replenishment arrives." },
          { key: "overstocked_items", label: "Overstocked Items", value: 10, unit: "number", change_pct: -28.6, status: "warning", hint: "10 products with >180 days forward cover", tooltip: "Products whose current stock may exceed expected demand." },
        ],
        trend: s.map((p) => {
          const val = 41390 - p.i * 12 + (p.i % 8 === 0 ? 320 : 0);
          return { date: p.date, available_units: val, stock_units: val, units_sold: 45 + (p.i % 5) * 8, units_restocked: (p.i % 8 === 0 ? 320 : 0) };
        }),
        trend_keys: [{ key: "available_units", label: "Available Units", unit: "number" }],
        breakdown: [
          { name: "IndiCore Smartwatch", value: 4.9, sku: "PROD0227", category: "Electronics", risk: "stockout" },
          { name: "NaturalEssence Serum", value: 10.4, sku: "PROD0304", category: "Beauty", risk: "stockout" },
          { name: "AuraTech USB-C Hub", value: 27.3, sku: "PROD0468", category: "Electronics", risk: "stockout" },
          { name: "AeroTrack Earbuds", value: 31.2, sku: "PROD0101", category: "Audio", risk: "low_stock" },
        ],
        low_cover_products: [
          { name: "IndiCore Smartwatch", value: 4.9, sku: "PROD0227", category: "Electronics", risk: "stockout" },
          { name: "NaturalEssence Serum", value: 10.4, sku: "PROD0304", category: "Beauty", risk: "stockout" },
          { name: "AuraTech USB-C Hub", value: 27.3, sku: "PROD0468", category: "Electronics", risk: "stockout" },
          { name: "AeroTrack Earbuds", value: 31.2, sku: "PROD0101", category: "Audio", risk: "low_stock" },
        ],
        overstocked_products: [
          { name: "AeroTrack Dumbbells", value: 270.0, sku: "PROD0089", category: "Fitness", risk: "overstock" },
          { name: "LuxeOrganics Cream", value: 256.0, sku: "PROD0045", category: "Beauty", risk: "overstock" },
          { name: "GramShree Green Tea", value: 236.0, sku: "PROD0112", category: "Grocery", risk: "overstock" },
        ],
        breakdown_label: "Days of Stock Cover",
        breakdown_unit: "number",
        table: {
          columns: [
            { key: "product_name", label: "Product" },
            { key: "current_stock", label: "Available Stock", unit: "number" },
            { key: "days_of_cover", label: "Days of Cover", unit: "number" },
            { key: "avg_daily_demand", label: "Expected Daily Demand", unit: "number" },
            { key: "replenishment_lead_time", label: "Replenishment Lead Time" },
            { key: "risk", label: "Risk Level" },
            { key: "suggested_action", label: "Suggested Action" },
          ],
          rows: [
            { product_id: "PROD0227", product_name: "IndiCore Smartwatch", category: "Electronics", current_stock: 7, days_of_cover: 4.9, avg_daily_demand: 1.43, replenishment_lead_time: "Not tracked", risk: "stockout", suggested_action: "Expedite Purchase Order" },
            { product_id: "PROD0304", product_name: "NaturalEssence Serum", category: "Beauty", current_stock: 18, days_of_cover: 10.4, avg_daily_demand: 1.73, replenishment_lead_time: "Not tracked", risk: "stockout", suggested_action: "Expedite Purchase Order" },
            { product_id: "PROD0468", product_name: "AuraTech USB-C Hub", category: "Electronics", current_stock: 30, days_of_cover: 27.3, avg_daily_demand: 1.10, replenishment_lead_time: "Not tracked", risk: "stockout", suggested_action: "Expedite Purchase Order" },
            { product_id: "PROD0089", product_name: "AeroTrack Dumbbells", category: "Fitness", current_stock: 540, days_of_cover: 270.0, avg_daily_demand: 2.00, replenishment_lead_time: "Not tracked", risk: "overstock", suggested_action: "Run Clearance Promotion" },
          ],
        },
      };
    case "marketing":
      return { ...common,
        kpis: [
          { key: "spend", label: "Ad Spend", value: 251368.11, unit: "currency", change_pct: 4.6, status: "good", hint: "₹8,379/day across 5 channels", comparison_label: "vs last period", tooltip: "Total advertising investment spent on digital marketing campaigns during the selected period." },
          { key: "revenue", label: "Attributed Revenue", value: 4884372.15, unit: "currency", change_pct: 12.4, status: "good", hint: "1,505 orders at ₹3,245 AOV", comparison_label: "vs last period", tooltip: "Estimated sales revenue generated from marketing campaigns, calculated from verified customer conversions multiplied by average order value." },
          { key: "roas", label: "Return on Ad Spend (ROAS)", value: 19.4, unit: "number", change_pct: 7.5, status: "good", hint: "Target: 3.0x (Above benchmark)", comparison_label: "vs last period", tooltip: "Revenue earned for every rupee spent on ads (Revenue ÷ Ad Spend). A ROAS of 4.0x means every ₹1 spent on ads generated ₹4 in sales." },
          { key: "cac", label: "Cost Per Acquisition (CPA)", value: 167.0, unit: "currency", change_pct: -6.9, status: "good", hint: "CTR: 2.9% (46,105 clicks)", comparison_label: "vs last period", tooltip: "Average advertising cost to acquire one completed customer order (Ad Spend ÷ Conversions). Lower costs indicate higher marketing efficiency." },
        ],
        trend: s.map((p) => {
          const spend = Math.round(7500 + (p.i % 7) * 350 + (p.i % 3) * 200);
          const conversions = Math.round(42 + (p.i % 5) * 5);
          const revenue = Math.round(conversions * 3245.43);
          const roas = Number((revenue / (spend || 1)).toFixed(1));
          return { date: p.date, spend, revenue, roas, conversions };
        }),
        trend_keys: [
          { key: "revenue", label: "Attributed Revenue", unit: "currency" },
          { key: "spend", label: "Ad Spend", unit: "currency" },
        ],
        breakdown: [
          { name: "Search", value: 16.1, spend: 75276.94, revenue: 1213790.82, conversions: 374, cpa: 201.3, ctr: 3.5, status: "strong" },
          { name: "Social Media", value: 11.7, spend: 97717.82, revenue: 1145636.79, conversions: 353, cpa: 276.8, ctr: 2.2, status: "strong" },
          { name: "Email", value: 109.8, spend: 18384.53, revenue: 2018657.46, conversions: 622, cpa: 29.6, ctr: 5.1, status: "strong" },
          { name: "Affiliate", value: 12.3, spend: 27907.29, revenue: 344015.58, conversions: 106, cpa: 263.3, ctr: 2.8, status: "moderate" },
          { name: "Display", value: 5.1, spend: 32081.53, revenue: 162271.50, conversions: 50, cpa: 641.6, ctr: 1.4, status: "attention" },
        ],
        breakdown_label: "Channel Return on Ad Spend (ROAS)",
        breakdown_unit: "number",
        table: {
          columns: [
            { key: "campaign_name", label: "Campaign / Channel" },
            { key: "channel_category", label: "Channel Type" },
            { key: "spend", label: "Ad Spend", unit: "currency" },
            { key: "revenue", label: "Attributed Revenue", unit: "currency" },
            { key: "roas", label: "ROAS", unit: "number" },
            { key: "conversions", label: "Conversions", unit: "number" },
            { key: "cost_per_acquisition", label: "CPA", unit: "currency" },
            { key: "click_through_rate_pct", label: "CTR", unit: "percent" },
            { key: "status", label: "Status" },
            { key: "recommended_action", label: "Recommended Action" },
          ],
          rows: [
            { campaign_name: "Google Search - High-Intent Commercial", channel: "Search", channel_category: "Search Ads", spend: 75276.94, revenue: 1213790.82, roas: 16.1, conversions: 374, cost_per_acquisition: 201.28, click_through_rate_pct: 3.46, conversion_rate_pct: 3.46, status: "strong", recommended_action: "Scale Budget (+20%) to capture untapped high-intent search demand" },
            { campaign_name: "Meta / Instagram - Reels & Carousel Prospecting", channel: "Social Media", channel_category: "Paid Social", spend: 97717.82, revenue: 1145636.79, roas: 11.7, conversions: 353, cost_per_acquisition: 276.82, click_through_rate_pct: 2.23, conversion_rate_pct: 2.68, status: "strong", recommended_action: "Scale top-performing video reels and test lookalike audiences" },
            { campaign_name: "Email Retention - Automated VIP & Abandoned Cart", channel: "Email", channel_category: "Owned / Lifecycle", spend: 18384.53, revenue: 2018657.46, roas: 109.8, conversions: 622, cost_per_acquisition: 29.56, click_through_rate_pct: 5.07, conversion_rate_pct: 4.30, status: "strong", recommended_action: "Expand automated lifecycle flows and reward repeat buyers" },
            { campaign_name: "Affiliate Network - Deal Publishers & Influencers", channel: "Affiliate", channel_category: "Partner Referral", spend: 27907.29, revenue: 344015.58, roas: 12.3, conversions: 106, cost_per_acquisition: 263.28, click_through_rate_pct: 2.76, conversion_rate_pct: 2.63, status: "moderate", recommended_action: "Partner with top coupon & review portals on tiered commissions" },
            { campaign_name: "Display Retargeting - Dynamic Catalog Banners", channel: "Display", channel_category: "Programmatic Display", spend: 32081.53, revenue: 162271.50, roas: 5.1, conversions: 50, cost_per_acquisition: 641.63, click_through_rate_pct: 1.41, conversion_rate_pct: 1.38, status: "attention", recommended_action: "Cap ad budget, tighten frequency caps, and trim low-converting placements" },
          ],
        },
        marketing_insights: [
          {
            id: "mkt-insight-1",
            title: "High ROI Channels: Search & Email Lead Return Multiple",
            text: "Google Search (16.1x ROAS) and Email Marketing (109.8x ROAS) generated ₹3,232,448 combined revenue on ₹93,661 spend. Testing incremental budget reallocation toward top-performing channels can help improve blended profitability without increasing overall marketing budget.",
            tone: "good",
            link: { text: "Simulate Budget Shift", to: "/simulation" },
          },
          {
            id: "mkt-insight-2",
            title: "Efficiency Optimization: Display Requires Placement Audit",
            text: "Display delivered 5.1x ROAS with an elevated CPA of ₹641.6 (compared to the ₹167.0 portfolio average). Higher acquisition costs on display banners dilute margin on lower-ticket orders. We recommend capping impression frequency and restricting display spend to dynamic retargeting of recent cart abandoners.",
            tone: "warning",
            link: { text: "View Recommendations", to: "/recommendations?category=marketing" },
          },
          {
            id: "mkt-insight-3",
            title: "Blended Unit Economics: ₹167.0 CPA Across 1,505 Orders",
            text: "The overall marketing portfolio operates at 19.4x blended ROAS (+7.5% vs last period). Digital advertising spend accounts for only 5.1% of attributed sales, maintaining healthy customer acquisition margins.",
            tone: "analytics",
            link: { text: "Analyze Marketing Funnel", to: "/root-cause?metric=acquisition" },
          },
        ],
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
  const s = series(30, 1120000, 120000);
  const factorCards: T.RcaFactorCard[] = [
    {
      factor_id: "factor_competitor_pricing",
      title: "Competitor Pricing & Undercutting",
      category: "competitive",
      relationship: "negative",
      evidence_classification: "statistical_association",
      classification_label: "Statistical Association",
      classification_color: "text-blue-500",
      observed_change: "Marketplace undercut share moved from 14.2% to 18.7% across tracked Amazon and Flipkart listings",
      evidence: "Average competitor price dropped from ₹3,999 to ₹3,700 across top catalog items.",
      simple_explanation: "Competitors reduced prices on key overlapping items, dampening store conversion.",
      contribution_pct: 28.5,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Empirical price checks scraped across Amazon & Flipkart matched listings.",
      scope_note: "Catalog Monitoring",
    },
    {
      factor_id: "factor_promotions",
      title: "Promotions & Product Discounts",
      category: "pricing",
      relationship: "positive",
      evidence_classification: "measured_contribution",
      classification_label: "Measured Contribution",
      classification_color: "text-emerald-500",
      observed_change: "Average catalog discount moved from 6.2% to 11.4% (total promotional concessions: ₹1.45L)",
      evidence: "Promotional discount difference of ₹78,200 recorded across active sales order line items.",
      simple_explanation: "Promotional price cuts stimulated order volume but compressed net realized revenue.",
      contribution_pct: 22.0,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Calculated from line-item unit_price and final_price sales order records.",
      scope_note: "Catalog Pricing Audit",
    },
    {
      factor_id: "factor_marketing",
      title: "Marketing Activity & ROAS",
      category: "marketing",
      relationship: "positive",
      evidence_classification: "measured_contribution",
      classification_label: "Measured Contribution",
      classification_color: "text-emerald-500",
      observed_change: "Daily ad spend shifted by -12.5% (₹8,900 → ₹7,780/day)",
      evidence: "Paid search & social impressions declined from 84,000 to 73,500/day across store campaigns.",
      simple_explanation: "Reduced campaign budgets led directly to fewer top-of-funnel visitors during non-sale weekdays.",
      contribution_pct: 18.2,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Based on ad campaign spend and clickstream logs from advertising platform records.",
      scope_note: "Store-wide Marketing",
    },
    {
      factor_id: "factor_returns",
      title: "Customer Returns & Refund Payouts",
      category: "operations",
      relationship: "negative",
      evidence_classification: "measured_contribution",
      classification_label: "Measured Contribution",
      classification_color: "text-emerald-500",
      observed_change: "Return rate moved from 7.1% to 8.3%; total customer refunds recorded at ₹24.07L",
      evidence: "779 returned orders verified out of 9,350 delivered orders. Pre-dispatch cancellations are strictly excluded.",
      simple_explanation: "Customer returns incur direct refund reversals and reverse logistics processing fees.",
      contribution_pct: 12.4,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Delivered orders genuinely marked Returned in order records.",
      scope_note: "Eligible Delivered Orders",
    },
    {
      factor_id: "factor_cancellations",
      title: "Pre-Dispatch Order Cancellations",
      category: "operations",
      relationship: "negative",
      evidence_classification: "measured_contribution",
      classification_label: "Measured Contribution",
      classification_color: "text-emerald-500",
      observed_change: "Cancellation rate moved from 7.2% to 7.8%; lost order pipeline value at ₹25.02L",
      evidence: "816 pre-dispatch cancellations logged out of 10,476 total placed orders.",
      simple_explanation: "Pre-dispatch cancellations represent unfulfilled gross order bookings cancelled prior to shipment.",
      contribution_pct: 10.9,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Orders cancelled before fulfillment over total placed orders.",
      scope_note: "Placed Order Pipeline",
    },
    {
      factor_id: "factor_seasonality",
      title: "Calendar Cycles & Day-of-Week Cadence",
      category: "seasonality",
      relationship: "neutral",
      evidence_classification: "model_explanation",
      classification_label: "Model Explanation",
      classification_color: "text-indigo-500",
      observed_change: "Recurring weekly purchasing pattern with regular Saturday & Sunday consumer shopping peaks",
      evidence: "Historical time-series decomposition confirms significant day-of-week cadence variation.",
      simple_explanation: "Consumer discretionary shopping concentrates around weekends and bi-weekly salary cycles.",
      contribution_pct: 8.0,
      metric_impact_type: "Relative Factor Importance",
      methodology_explanation: "Derived from historical 366-day time-series regression and TreeSHAP day-of-week feature weights.",
      scope_note: "Calendar Baseline",
    },
  ];

  const waterfallSteps: T.RcaWaterfallStep[] = [
    { name: "Previous Baseline (02 Nov – 01 Dec 2024)", value: 34586343.55, formatted_value: "₹34,586,343.55", category: "baseline", is_subtotal: true, note: "Authoritative historical baseline for Store-wide Catalog" },
    { name: "Promotional Discount Concessions", value: -128450.00, formatted_value: "-₹128,450.00", category: "pricing", is_subtotal: false, note: "Net variation in promotional price concessions (+₹128,450.00)" },
    { name: "Customer Return Refunds", value: -84200.00, formatted_value: "-₹84,200.00", category: "operations", is_subtotal: false, note: "Net difference in customer return refund payouts (+₹84,200.00)" },
    { name: "Pre-Dispatch Order Cancellations", value: -56100.00, formatted_value: "-₹56,100.00", category: "operations", is_subtotal: false, note: "Net variance in pre-dispatch cancelled order pipeline (+₹56,100.00)" },
    { name: "Unexplained Business Residual", value: -585456.56, formatted_value: "-₹585,456.56", category: "residual", is_residual: true, note: "Unexplained residual (-₹585,456.56, 68.5% of total change) reflects organic consumer demand shifts, unmeasured price elasticity, and external marketplace trends." },
    { name: "Current Period Total (02 Dec – 31 Dec 2024)", value: 33732136.99, formatted_value: "₹33,732,136.99", category: "final", is_subtotal: true, note: "Authoritative current performance for Store-wide Catalog" },
  ];

  return {
    controls: {
      metric: "revenue",
      metric_label: "Net Revenue",
      period: "30d",
      period_label: "Last 30 Days",
      comparison_type: "previous_equivalent_period",
      start_date: "2024-12-02",
      end_date: "2024-12-31",
      prev_start_date: "2024-11-02",
      prev_end_date: "2024-12-01",
    },
    summary: {
      metric_key: "revenue",
      metric_label: "Net Revenue",
      unit: "currency",
      current_value: 33732136.99,
      previous_value: 34586343.55,
      absolute_change: -854206.56,
      percent_change: -2.47,
      severity: "stable",
      period_current_label: "02 Dec 2024 – 31 Dec 2024",
      period_previous_label: "02 Nov 2024 – 01 Dec 2024",
      simple_explanation: "Net Revenue for store-wide catalog decreased by 2.5% (₹854,206.56) in 02 Dec 2024 – 31 Dec 2024 compared to the previous period (02 Nov 2024 – 01 Dec 2024).",
      investigation_scope: "Store-wide Catalog",
    },
    factor_cards: factorCards,
    financial_impact: {
      is_additive_waterfall: true,
      title: "Reconciled Financial Value Decomposition",
      subtitle: "Additive bridge accounting for metric change between baseline and current periods",
      baseline_value: 34586343.55,
      final_value: 33732136.99,
      total_change: -854206.56,
      steps: waterfallSteps,
      unexplained_residual: -585456.56,
      reconciliation_verified: true,
      reconciliation_note: "Exact financial reconciliation: Baseline + Measured Operational Variances + Unexplained Residual = Current Period Total.",
    },
    business_impact: {
      by_product: [
        { id: "PROD0102", name: "Wireless Noise-Canceling Headphones", secondary_info: "Audio", current_val: 4120000, previous_val: 4450000, abs_change: -330000, pct_change: -7.42, share_pct: 12.2, status: "In Stock" },
        { id: "PROD0261", name: "ElectraPlus Wireless Earbuds", secondary_info: "Electronics", current_val: 386432.53, previous_val: 428024.18, abs_change: -41591.65, pct_change: -9.72, share_pct: 1.15, status: "In Stock" },
        { id: "PROD0305", name: "Smart Fitness Watch Gen 2", secondary_info: "Wearables", current_val: 3210000, previous_val: 3480000, abs_change: -270000, pct_change: -7.76, share_pct: 9.5, status: "In Stock" },
      ],
      by_category: [
        { id: "Electronics", name: "Electronics", current_val: 14250000, previous_val: 14780000, abs_change: -530000, pct_change: -3.59, share_pct: 42.2 },
        { id: "Audio", name: "Audio", current_val: 12450000, previous_val: 12980000, abs_change: -530000, pct_change: -4.08, share_pct: 36.9 },
      ],
      by_channel: [
        { id: "direct", name: "Direct Website", current_val: 18200000, previous_val: 18750000, abs_change: -550000, pct_change: -2.93, share_pct: 54.0 },
        { id: "amazon", name: "Amazon Marketplace", current_val: 15532136.99, previous_val: 15836343.55, abs_change: -304206.56, pct_change: -1.92, share_pct: 46.0 },
      ],
      by_segment: [
        { id: "repeat", name: "Loyal Customers", current_val: 21850000, previous_val: 22100000, abs_change: -250000, pct_change: -1.13, share_pct: 64.8 },
        { id: "regular", name: "Regular Shoppers", current_val: 11882136.99, previous_val: 12486343.55, abs_change: -604206.56, pct_change: -4.84, share_pct: 35.2 },
      ],
    },
    unusual_activity: s.map((p, i) => ({
      date: p.date,
      day_name: new Date(p.date).toLocaleDateString("en-US", { weekday: "short" }),
      actual: p.v,
      expected: Math.round(p.v * (i === 12 ? 1.25 : 1)),
      deviation_abs: i === 12 ? -Math.round(p.v * 0.25) : 0,
      deviation_pct: i === 12 ? -20.0 : 0,
      is_anomaly: i === 12,
      severity: i === 12 ? ("warning" as const) : ("normal" as const),
      flag: i === 12 ? p.v : null,
    })),
    event_timeline: [
      { event_id: "promo_1", date: "2024-12-14", event_type: "promotion", title: "Campaign Launch: Year-End Mega Clearance", description: "Catalog promotional discount offering up to 15% off.", impact_level: "high", affected_entity: "All Catalog" },
      { event_id: "comp_1", date: "2024-12-18", event_type: "competitor", title: "Amazon discounted competing wearable listings by 8%", description: "Scraper recorded price drop across top 3 competing SKUs.", impact_level: "high", affected_entity: "Wearables & Audio" },
    ],
    next_steps: [
      { step_number: 1, title: "Review Promotional Pricing on ElectraPlus Wireless Earbuds (PROD0261)", action_type: "pricing_audit", description: "Promotional discount concessions increased significantly. Evaluate margin impact in simulator.", link_module: "What-If Simulation", link_path: "/simulation?product_id=PROD0261", context_params: { product_id: "PROD0261" } },
      { step_number: 2, title: "Audit Marketplace Price Undercuts", action_type: "competitor_review", description: "18.7% of marketplace price checks undercut your store listing. Inspect Buy-Box parity.", link_module: "Competitive Intelligence", link_path: "/competition", context_params: { category: "Electronics" } },
      { step_number: 3, title: "Review Return Quality Control", action_type: "operations_audit", description: "Delivered return rate is at 8.3%. Inspect return reasons in Business Analytics.", link_module: "Business Analytics", link_path: "/analytics?section=inventory", context_params: { metric: "returns" } },
    ],
    advanced_analysis: {
      model_name: "XGBoost Regressor (TreeSHAP)",
      training_window: "Full 2024 Historical Dataset (366 daily observations, 74 out-of-time test days)",
      training_sample_count: 366,
      r2_fit: 0.532,
      methodology_notes: "Models benchmarked using 80/20 chronological walk-forward time-series validation (74 evaluation test days). Note: TreeSHAP values quantify how input features influence the machine learning model's numerical forecast; they explain model predictions and do not establish direct business causation.",
      shap_features: [
        { feature: "spend", business_meaning: "Marketing Ad Spend (Direct Customer Acquisition)", mean_abs_shap: 42500, direction_impact: "positive", rank: 1 },
        { feature: "is_festival", business_meaning: "Festival Season Promotional Demand Surge", mean_abs_shap: 31200, direction_impact: "positive", rank: 2 },
        { feature: "day_of_week", business_meaning: "Day of Week Pattern (Weekend Shopping Lift)", mean_abs_shap: 18900, direction_impact: "positive", rank: 3 },
      ],
      model_benchmarks: [
        { model_name: "XGBoost Regressor", r2_score: 0.532, mae: 233290.82, rmse: 382590.19, relative_error_pct: 18.7, benchmark_status: "Best Among Tested Models" },
        { model_name: "Random Forest Regressor", r2_score: 0.508, mae: 232698.77, rmse: 392562.84, relative_error_pct: 18.7, benchmark_status: "Alternative Candidate" },
        { model_name: "ARIMA (1,1,1)", r2_score: -0.084, mae: 351375.24, rmse: 582352.43, relative_error_pct: 28.2, benchmark_status: "Time-Series Baseline" },
      ],
    },
    problem: {
      title: "Net Revenue decreased by 2.5% (₹854,206.56)",
      metric: "Net Revenue",
      change_pct: -2.47,
      period: "02 Dec 2024 – 31 Dec 2024 vs 02 Nov 2024 – 01 Dec 2024",
      summary: "Net Revenue for store-wide catalog decreased by 2.5% (₹854,206.56) in 02 Dec 2024 – 31 Dec 2024 compared to the previous period.",
    },
    main_cause: {
      factor: "Competitor Pricing & Undercutting",
      contribution_pct: 28.5,
      explanation: "Marketplace undercut share moved from 14.2% to 18.7% across tracked Amazon and Flipkart listings.",
    },
    factors: [
      { factor: "Competitor Pricing & Undercutting", contribution_pct: 28.5, direction: "negative", explanation: "Marketplace rivals priced cheaper on key items." },
      { factor: "Promotions & Product Discounts", contribution_pct: 22.0, direction: "positive", explanation: "Higher promotional discounts compressed net revenue." },
      { factor: "Marketing Activity & ROAS", contribution_pct: 18.2, direction: "positive", explanation: "Ad spend decreased by 12.5%." },
      { factor: "Customer Returns & Refund Payouts", contribution_pct: 12.4, direction: "negative", explanation: "Delivered return rate was 8.3%." },
      { factor: "Pre-Dispatch Order Cancellations", contribution_pct: 10.9, direction: "negative", explanation: "Pre-dispatch cancellation rate was 7.8%." },
      { factor: "Calendar Cycles & Day-of-Week Cadence", contribution_pct: 8.0, direction: "neutral", explanation: "Weekly purchasing rhythm." },
    ],
    waterfall: waterfallSteps.map((w) => ({ name: w.name, value: w.value })),
    anomalies: s.map((p, i) => ({
      date: p.date,
      value: p.v,
      expected: Math.round(p.v * (i === 12 ? 1.25 : 1)),
      anomaly: i === 12,
    })),
    shap: [
      { feature: "spend", importance: 0.42 },
      { feature: "is_festival", importance: 0.31 },
      { feature: "day_of_week", importance: 0.18 },
    ],
    model_info: { model: "XGBoost Regressor (TreeSHAP)", samples: 366, r2: 0.532 },
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
