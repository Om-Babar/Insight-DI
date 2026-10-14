export type Severity = "critical" | "warning" | "info" | "positive";
export type Priority = "high" | "medium" | "low";

export interface Kpi {
  key: string;
  label: string;
  value: number;
  unit: "currency" | "number" | "percent";
  change_pct: number;
  status: "good" | "warning" | "critical";
  hint?: string;
  tooltip?: string;
  comparison_label?: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  alert_type?: string;
  product_id?: string;
  product_name?: string;
  competitor_name?: string;
  previous_price?: number;
  latest_price?: number;
  price_diff_abs?: number;
  price_diff_pct?: number;
  last_observed?: string;
  recommended_action?: string;
  link?: string;
  created_at: string;
}


export interface TrendPoint {
  date: string;
  actual?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
}

export interface ProductPerf {
  sku: string;
  name: string;
  category: string;
  revenue: number;
  units: number;
  margin_pct: number;
  change_pct: number;
}

export interface InventoryAlert {
  sku: string;
  name: string;
  stock: number;
  days_of_cover: number;
  risk: "stockout" | "overstock" | "ok";
}

export interface Overview {
  as_of: string;
  health_summary: string;
  kpis: Kpi[];
  alerts: Alert[];
  revenue_trend: TrendPoint[];
  top_products: ProductPerf[];
  bottom_products: ProductPerf[];
  inventory_alerts: InventoryAlert[];
  competitive_summary: { cheaper: number; matched: number; pricier: number; last_collected: string };
  top_recommendations: Recommendation[];
}

export type AnalyticsSection = "sales" | "products" | "customers" | "inventory" | "marketing";

export interface AnalyticsData {
  section: AnalyticsSection;
  kpis: Kpi[];
  trend: { date: string; [k: string]: number | string }[];
  trend_keys: { key: string; label: string; unit: "currency" | "number" | "percent" }[];
  breakdown: { name: string; value: number; secondary?: number }[];
  breakdown_label: string;
  breakdown_unit: "currency" | "number" | "percent";
  table: { columns: { key: string; label: string; unit?: "currency" | "number" | "percent" }[]; rows: Record<string, string | number>[] };
}

export interface ForecastInsight {
  category: "trajectory" | "pattern" | "implication" | "action";
  title: string;
  description: string;
  action_label?: string;
  action_route?: string;
  tone: "positive" | "neutral" | "warning" | "info";
}

export interface ModelScore {
  model: string;
  mape: number;
  rmse: number;
  r2: number;
  selected: boolean;
  mae?: number;
  test_days?: number;
}

export interface ForecastData {
  model: string;
  horizon_days: number;
  generated_at: string;
  data_freshness_date?: string;
  latest_actual_date?: string;
  forecast_start_date?: string;
  forecast_end_date?: string;
  previous_period_start_date?: string;
  previous_period_end_date?: string;
  is_data_stale?: boolean;
  data_stale_days?: number;
  summary: string;
  series: TrendPoint[];
  models: ModelScore[];
  expected_total: number;
  expected_change_pct: number;
  expected_change_abs: number;
  previous_period_revenue: number;
  total_lower_bound: number;
  total_upper_bound: number;
  insights: ForecastInsight[];
  historical_start_date?: string;
}

export interface CompetitorListing {
  platform: "amazon" | "flipkart";
  price: number | null;
  discount_pct: number | null;
  rating: number | null;
  reviews: number | null;
  availability: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
  match_confidence: number;
  url?: string;
  collected_at: string;
  status: "fresh" | "stale" | "failed" | "unconfigured" | "configured" | "not_synced" | "last_known_data";
}

export interface CompetitorProduct {
  sku: string;
  name: string;
  category?: string;
  our_price: number;
  our_discount_pct: number;
  our_rating: number;
  our_reviews: number;
  our_availability: CompetitorListing["availability"];
  position: "cheapest" | "competitive" | "overpriced";
  price_gap_vs_lowest_pct?: number | null;
  price_gap_vs_lowest_abs?: number | null;
  lowest_competitor_price?: number | null;
  last_checked?: string;
  listings: CompetitorListing[];
  price_history: { date: string; ours: number; amazon?: number; flipkart?: number }[];
}

export interface CIOverviewMetrics {
  products_monitored: number;
  price_alerts_count: number;
  products_priced_above_count: number;
  competitor_availability_changes_count: number;
  cheapest_count: number;
  competitive_count: number;
}

export interface CIInsightItem {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  suggested_action: string;
}

export interface CompetitionData {
  last_collected: string;
  overview?: CIOverviewMetrics;
  sources: { platform: string; status: "fresh" | "stale" | "failed" | "unconfigured" | "configured" | "not_synced" | "last_known_data"; last_collected: string; products: number; message?: string }[];
  products: CompetitorProduct[];
  alerts: Alert[];
  insights?: CIInsightItem[];
  scrape_status?: Record<string, any>;
}

export interface RcaData {
  problem: { title: string; metric: string; change_pct: number; period: string; summary: string };
  main_cause: { factor: string; contribution_pct: number; explanation: string };
  factors: { factor: string; contribution_pct: number; direction: "negative" | "positive"; explanation: string }[];
  waterfall: { name: string; value: number }[];
  anomalies: { date: string; value: number; expected: number; anomaly: boolean }[];
  shap: { feature: string; importance: number }[];
  model_info: { model: string; samples: number; r2: number };
}

export interface Recommendation {
  id: string;
  action: string;
  category: "pricing" | "inventory" | "marketing" | "product" | "operations";
  priority: Priority;
  reason: string;
  evidence: string[];
  expected_impact: string;
  impact_value?: number;
  confidence: number;
  status: "open" | "accepted" | "dismissed" | "done";
}

export interface SimulationInput {
  ad_spend: number;
  price: number;
  discount_pct: number;
  restock_units: number;
}

export interface SimulationMetrics {
  orders: number;
  revenue: number;
  profit: number;
  stockout_probability: number;
}

export interface SimulationResult {
  baseline_input: SimulationInput;
  baseline: SimulationMetrics;
  simulated: SimulationMetrics;
  impact: { name: string; value: number }[];
  notes: string[];
}

export interface CopilotAnswer {
  answer: string;
  highlights: { label: string; value: string; tone?: "good" | "warning" | "critical" }[];
  next_steps: { label: string; to: string }[];
  sources: ("internal" | "competitor" | "external")[];
}

export interface ColumnMapping {
  source_column: string;
  target_field: string | null;
  confidence: number;
  sample: string;
}

export interface DatasetProfile {
  id: string;
  filename: string;
  rows: number;
  columns: number;
  detected_type: string;
  type_confidence: number;
  quality_score: number;
  mapping: ColumnMapping[];
  target_fields: string[];
  issues: { kind: "missing" | "duplicate" | "invalid" | "relationship"; column?: string; count: number; detail: string; fix?: string }[];
}

export interface UploadHistoryItem {
  id: string;
  upload_id?: number | string;
  filename: string;
  detected_type: string;
  file_type?: string;
  rows: number;
  row_count?: number;
  column_count?: number;
  quality_score: number;
  status: "ingested" | "processing" | "failed" | "pending_review" | "rejected";
  uploaded_at: string;
  data_coverage?: string;
  last_processed_at?: string;
  impact_modules?: string[];
  rejection_reason?: string;
}

export interface ReportItem {
  id: string;
  type: string;
  from: string;
  to: string;
  created_at: string;
  status: "ready" | "generating" | "failed";
}
