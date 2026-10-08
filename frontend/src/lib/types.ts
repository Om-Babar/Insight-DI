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
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
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

export interface ModelScore {
  model: string;
  mape: number;
  rmse: number;
  r2: number;
  selected: boolean;
}

export interface ForecastData {
  model: string;
  horizon_days: number;
  generated_at: string;
  summary: string;
  series: TrendPoint[];
  models: ModelScore[];
  expected_total: number;
  expected_change_pct: number;
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
  status: "fresh" | "stale" | "failed";
}

export interface CompetitorProduct {
  sku: string;
  name: string;
  our_price: number;
  our_discount_pct: number;
  our_rating: number;
  our_reviews: number;
  our_availability: CompetitorListing["availability"];
  position: "cheapest" | "competitive" | "overpriced";
  listings: CompetitorListing[];
  price_history: { date: string; ours: number; amazon?: number; flipkart?: number }[];
}

export interface CompetitionData {
  last_collected: string;
  sources: { platform: string; status: "fresh" | "stale" | "failed"; last_collected: string; products: number }[];
  products: CompetitorProduct[];
  alerts: Alert[];
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
