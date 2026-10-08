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
  overview: () => request<T.Overview>("/api/v1/overview/summary", undefined, preview.overview),
  
  analytics: (section: T.AnalyticsSection, range: string) => {
    let path = "/api/v1/analytics/";
    if (section === "sales") path += "sales/trends";
    else if (section === "products") path += "products/performance";
    else if (section === "customers") path += "customers/demographics";
    else if (section === "inventory") path += "inventory/status";
    else if (section === "marketing") path += "marketing/campaigns";
    return request<T.AnalyticsData>(`${path}${qs({ range })}`, undefined, () => preview.analytics(section));
  },
  
  forecast: (horizon: number, model: string, category?: string) => {
    const path = model === "arima" ? "/api/v1/forecast/timeseries" : "/api/v1/forecast/revenue";
    const method = model === "arima" ? "GET" : "POST";
    const body = model === "arima" ? undefined : JSON.stringify({ horizon_days: horizon, model_type: model });
    return request<T.ForecastData>(`${path}${qs(model === "arima" ? { horizon } : {})}`, { method, body }, () => preview.forecast(horizon, model));
  },
  
  competition: () => request<T.CompetitionData>("/api/v1/competitors/benchmark", undefined, preview.competition),
  
  refreshCompetition: () =>
    request<{ job_id: string; status: string }>("/api/v1/competitors/scrape", { method: "POST", body: JSON.stringify({ keywords: ["competitor"] }) }, () => ({ job_id: "preview", status: "completed" })),
    
  rca: () => request<T.RcaData>("/api/v1/rca/diagnose", undefined, preview.rca),
  
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
