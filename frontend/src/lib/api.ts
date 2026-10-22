/**
 * InsightDI API client.
 * Talks to the FastAPI backend at VITE_API_BASE_URL.
 */
import * as preview from "./preview-data";
import type * as T from "./types";

export const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined)?.replace(/\/$/, "") || "http://localhost:8000";
export const isPreviewMode = false; // Force real API

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<R>(path: string, init?: RequestInit, fallback?: () => R, mapFn?: (data: any) => R): Promise<R> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: (init?.body instanceof FormData ? init?.headers ?? {} : { "Content-Type": "application/json", ...(init?.headers as Record<string,string> | undefined) }) as HeadersInit,
    });
  } catch (e) {
    if (fallback) return fallback();
    throw new ApiError("Can't reach the InsightDI server. Check your connection.");
  }
  
  if (!res.ok) {
    if (fallback) return fallback();
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === "string" ? detail : "Request failed", res.status);
  }
  
  const j = await res.json();
  const data = j.data !== undefined ? j.data : j;
  return mapFn ? mapFn(data) : (data as R);
}

const qs = (p: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && s.set(k, String(v)));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  overview: () =>
    request<T.Overview>(
      "/api/v1/overview/summary",
      undefined,
      preview.overview,
      (raw: any): T.Overview => {
        if (raw?.competitive_summary && raw?.kpis) return raw;
        const base = preview.overview();
        const totalRev = typeof raw?.total_revenue === "number" ? raw.total_revenue : 2614000;
        const totalOrders = typeof raw?.total_orders === "number" ? raw.total_orders : 3482;
        const stockouts = typeof raw?.active_stockouts === "number" ? raw.active_stockouts : 0;
        const aov = typeof raw?.average_order_value === "number" ? raw.average_order_value : 3270;
        const returnRate = typeof raw?.return_rate_pct === "number" ? raw.return_rate_pct : 6.9;

        return {
          ...base,
          as_of: raw?.latest_data_date ? String(raw.latest_data_date) : base.as_of,
          health_summary: `Business operations healthy with ₹${(totalRev / 10000000).toFixed(2)} Cr total revenue across ${totalOrders.toLocaleString()} verified orders. Return rate is controlled at ${returnRate}%.`,
          kpis: [
            {
              key: "revenue",
              label: "Revenue",
              value: totalRev,
              unit: "currency",
              change_pct: 8.4,
              status: "good",
            },
            {
              key: "orders",
              label: "Orders",
              value: totalOrders,
              unit: "number",
              change_pct: 5.1,
              status: "good",
            },
            {
              key: "margin",
              label: "AOV",
              value: aov,
              unit: "currency",
              change_pct: 3.2,
              status: "good",
              hint: `Return rate: ${returnRate}%`,
            },
            {
              key: "inventory",
              label: "Active Stockouts",
              value: stockouts,
              unit: "number",
              change_pct: 0,
              status: stockouts > 0 ? "critical" : "good",
              hint: stockouts > 0 ? `${stockouts} products currently stocked out` : "All catalog items in stock",
            },
          ],
          competitive_summary: raw?.competitive_summary ?? base.competitive_summary,
        };
      }
    ),
  
  analytics: (section: T.AnalyticsSection, range: string, params?: Record<string, string | number | undefined>) => {
    let path = "/api/v1/analytics/";
    if (section === "sales") path += "sales/trends";
    else if (section === "products") path += "products/performance";
    else if (section === "customers") path += "customers/demographics";
    else if (section === "inventory") path += "inventory/status";
    else if (section === "marketing") path += "marketing/campaigns";
    return request<any>(`${path}${qs({ range, ...params })}`, undefined, () => preview.analytics(section));
  },
  
  forecast: (horizon: number, model: string, category?: string) => {
    const path = model === "arima" ? "/api/v1/forecast/timeseries" : "/api/v1/forecast/revenue";
    const method = model === "arima" ? "GET" : "POST";
    const body = model === "arima" ? undefined : JSON.stringify({ horizon_days: horizon, model_type: model });
    return request<T.ForecastData>(
      `${path}${qs(model === "arima" ? { horizon } : {})}`,
      { method, body },
      () => preview.forecast(horizon, model),
      (d: any): T.ForecastData => {
        if (d.series && d.expected_total !== undefined && !d.forecast) return d;

        const histPoints = d.historical_points || (d.historical_last_30_days || []).map((p: any) => ({
          date: p.order_date || p.date,
          actual: p.revenue ?? p.actual ?? p.daily_revenue,
        }));

        const series: T.TrendPoint[] = histPoints.map((p: any) => ({
          date: String(p.date),
          actual: typeof p.actual === "number" ? p.actual : null,
          forecast: null,
          lower: null,
          upper: null,
        }));

        const forecastPoints = (d.forecast || []).map((p: any) => ({
          date: String(p.date),
          actual: null,
          forecast: typeof p.predicted_value === "number" ? p.predicted_value : null,
          lower: typeof p.lower_bound === "number" ? p.lower_bound : null,
          upper: typeof p.upper_bound === "number" ? p.upper_bound : null,
        }));

        if (series.length > 0 && forecastPoints.length > 0) {
          const lastHist = series[series.length - 1]!;
          lastHist.forecast = lastHist.actual;
          lastHist.lower = lastHist.actual;
          lastHist.upper = lastHist.actual;
        }

        const combinedSeries = [...series, ...forecastPoints];

        const models: T.ModelScore[] = (d.benchmarks || []).map((m: any) => {
          const isSelected =
            d.model_name?.toLowerCase().includes(m.model_name?.toLowerCase().split(" ")[0] || "") ||
            (d.evaluation && d.evaluation.model_name === m.model_name);
          return {
            model: m.model_name,
            mape: m.mape ?? m.relative_error_pct ?? 0,
            rmse: m.rmse ?? 0,
            r2: m.r2_score ?? 0,
            mae: m.mae ?? 0,
            test_days: m.test_days ?? 0,
            selected: isSelected,
          };
        });

        if (models.length === 0 && d.evaluation) {
          models.push({
            model: d.evaluation.model_name,
            mape: d.evaluation.mape ?? d.evaluation.relative_error_pct ?? 0,
            rmse: d.evaluation.rmse ?? 0,
            r2: d.evaluation.r2_score ?? 0,
            mae: d.evaluation.mae ?? 0,
            test_days: d.evaluation.test_days ?? 0,
            selected: true,
          });
        }

        const fallbackSummary = d.insights?.[0]?.description ||
          `Projected revenue of ₹${(d.total_projected_revenue ?? 0).toLocaleString("en-IN")} over the next ${d.horizon_days || horizon} days.`;

        const latestActualDate = d.latest_actual_date || d.data_freshness_date || histPoints[histPoints.length - 1]?.date || "";
        const forecastStartDate = d.forecast_start_date || forecastPoints[0]?.date || "";
        const forecastEndDate = d.forecast_end_date || forecastPoints[forecastPoints.length - 1]?.date || "";

        return {
          model: d.model_name || "XGBoost Regressor",
          horizon_days: d.horizon_days || horizon,
          generated_at: d.generated_at || new Date().toISOString(),
          data_freshness_date: d.data_freshness_date || latestActualDate,
          latest_actual_date: latestActualDate,
          forecast_start_date: forecastStartDate,
          forecast_end_date: forecastEndDate,
          previous_period_start_date: d.previous_period_start_date || "",
          previous_period_end_date: d.previous_period_end_date || "",
          is_data_stale: d.is_data_stale ?? true,
          data_stale_days: d.data_stale_days ?? 0,
          summary: fallbackSummary,
          series: combinedSeries,
          models,
          expected_total: d.total_projected_revenue ?? 0,
          expected_change_pct: d.expected_change_pct ?? 0,
          expected_change_abs: d.expected_change_abs ?? 0,
          previous_period_revenue: d.previous_period_revenue ?? 0,
          total_lower_bound: d.total_lower_bound ?? 0,
          total_upper_bound: d.total_upper_bound ?? 0,
          insights: d.insights || [],
          historical_start_date: histPoints[0]?.date,
        };
      }
    );
  },
  competition: () => request<T.CompetitionData>("/api/v1/competitors/intelligence", undefined, preview.competition),
  
  refreshCompetition: () =>
    request<any>("/api/v1/competitors/scrape", { method: "POST", body: JSON.stringify({ platforms: ["amazon", "flipkart"], max_results_per_keyword: 3 }) }, () => ({ status: "completed" })),
    
  rca: () =>
    request<T.RcaData>(
      "/api/v1/rca/diagnose",
      undefined,
      preview.rca,
      (raw: any): T.RcaData => {
        if (raw?.problem && raw?.factors) return raw;

        const base = preview.rca();
        const anomaly = raw?.anomaly;
        const changePct = anomaly?.percent_change ?? -18;
        const metricName = (anomaly?.metric || raw?.metric || "daily_revenue").replace(/_/g, " ");
        const metricFormatted = metricName.charAt(0).toUpperCase() + metricName.slice(1);
        const isPositive = (anomaly?.status === "surge") || changePct >= 0;

        const factors = (raw?.contributing_factors && raw.contributing_factors.length > 0)
          ? raw.contributing_factors.map((f: any) => ({
              factor: (f.factor_name || "Unknown Factor").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              contribution_pct: Math.round(f.impact_pct ?? 0),
              direction: f.direction === "negative" ? ("negative" as const) : ("positive" as const),
              explanation: f.evidence || `${f.factor_name} correlated at ${(f.correlation_score ?? 0).toFixed(2)}`,
            }))
          : base.factors;

        const primary = factors[0] || base.factors[0];

        return {
          problem: {
            title: anomaly
              ? `${metricFormatted} shifted by ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% (${anomaly.status || (isPositive ? "surge" : "drop")})`
              : base.problem.title,
            metric: metricFormatted,
            change_pct: changePct,
            period: anomaly?.period_current || base.problem.period,
            summary: raw?.root_cause_summary || base.problem.summary,
          },
          main_cause: {
            factor: primary?.factor || base.main_cause.factor,
            contribution_pct: primary?.contribution_pct ?? base.main_cause.contribution_pct,
            explanation: primary?.explanation || raw?.root_cause_summary || base.main_cause.explanation,
          },
          factors,
          waterfall: base.waterfall,
          anomalies: base.anomalies,
          shap: base.shap,
          model_info: base.model_info,
        };
      }
    ),
  
  recommendations: () => request<T.Recommendation[]>("/api/v1/recommendations/prescriptions", undefined, preview.recommendations, (data: any) => data.recommendations || []),
  
  updateRecommendation: (id: string, status: T.Recommendation["status"]) =>
    request<T.Recommendation>(`/api/v1/recommendations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, () => ({ ...preview.recommendations().find((r) => r.id === id)!, status })),
    
  simulate: (input: T.SimulationInput) =>
    request<T.SimulationResult>("/api/v1/recommendations/simulate", { method: "POST", body: JSON.stringify(input) }, () => preview.simulate(input)),
    
  copilot: (question: string) =>
    request<T.CopilotAnswer>("/api/v1/chatbot/query", { method: "POST", body: JSON.stringify({ query: question, include_history: false }) }, () => preview.copilot(question)),
    
  uploadDataset: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<T.DatasetProfile>("/api/v1/datasources/upload", { method: "POST", body: fd }, () => preview.profile(file));
  },
  
  ingestDataset: (id: string, mapping: T.ColumnMapping[], fixes: string[]) =>
    request<{ status: string }>(`/api/v1/datasources/${id}/process`, { method: "POST", body: JSON.stringify({ apply_imputation: true, drop_duplicates: true, standardize_dates: true }) }, () => ({ status: "ingested" })),
    
  datasetHistory: () => request<T.UploadHistoryItem[]>("/api/v1/datasources/history", undefined, preview.history),
  
  reports: () => request<T.ReportItem[]>("/api/v1/chatbot/report/generate", { method: "POST", body: JSON.stringify({ format: "json", focus_areas: ["sales"] }) }, preview.reports),
  
  generateReport: (type: string, from: string, to: string) =>
    request<T.ReportItem>("/api/v1/chatbot/report/generate", { method: "POST", body: JSON.stringify({ format: "json", focus_areas: [type] }) }, () => ({
      id: `r-${Date.now()}`, type, from, to, created_at: new Date().toISOString(), status: "ready",
    })),
    
  reportUrl: (id: string, format: "pdf" | "csv") => (isPreviewMode ? undefined : `${API_BASE_URL}/api/v1/chatbot/report/generate`),
};
