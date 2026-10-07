/**
 * InsightDI API client.
 * Talks to the FastAPI backend at VITE_API_BASE_URL. When that variable is not
 * configured, requests resolve from the clearly-labelled preview dataset in
 * ./preview-data so the UI can be reviewed. Set the variable to go live.
 */
import * as preview from "./preview-data";
import type * as T from "./types";

export const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined)?.replace(/\/$/, "");
export const isPreviewMode = !API_BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<R>(path: string, init?: RequestInit, fallback?: () => R): Promise<R> {
  if (isPreviewMode) {
    await new Promise((r) => setTimeout(r, 450));
    if (!fallback) throw new ApiError("Backend not connected");
    return fallback();
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: (init?.body instanceof FormData ? init?.headers ?? {} : { "Content-Type": "application/json", ...(init?.headers as Record<string,string> | undefined) }) as HeadersInit,
    });
  } catch {
    throw new ApiError("Can't reach the InsightDI server. Check your connection.");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === "string" ? detail : "Request failed", res.status);
  }
  return res.json() as Promise<R>;
}

const qs = (p: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && s.set(k, String(v)));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  overview: () => request<T.Overview>("/api/overview", undefined, preview.overview),
  analytics: (section: T.AnalyticsSection, range: string) =>
    request<T.AnalyticsData>(`/api/analytics/${section}${qs({ range })}`, undefined, () => preview.analytics(section)),
  forecast: (horizon: number, model: string, category?: string) =>
    request<T.ForecastData>(`/api/forecast${qs({ horizon, model, category })}`, undefined, () => preview.forecast(horizon, model)),
  competition: () => request<T.CompetitionData>("/api/competition", undefined, preview.competition),
  refreshCompetition: () =>
    request<{ job_id: string; status: string }>("/api/competition/refresh", { method: "POST" }, () => ({ job_id: "preview", status: "completed" })),
  rca: () => request<T.RcaData>("/api/rca", undefined, preview.rca),
  recommendations: () => request<T.Recommendation[]>("/api/recommendations", undefined, preview.recommendations),
  updateRecommendation: (id: string, status: T.Recommendation["status"]) =>
    request<T.Recommendation>(`/api/recommendations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, () => ({ ...preview.recommendations().find((r) => r.id === id)!, status })),
  simulate: (input: T.SimulationInput) =>
    request<T.SimulationResult>("/api/simulate", { method: "POST", body: JSON.stringify(input) }, () => preview.simulate(input)),
  copilot: (question: string) =>
    request<T.CopilotAnswer>("/api/copilot/ask", { method: "POST", body: JSON.stringify({ question }) }, () => preview.copilot(question)),
  uploadDataset: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<T.DatasetProfile>("/api/datasets/upload", { method: "POST", body: fd }, () => preview.profile(file));
  },
  ingestDataset: (id: string, mapping: T.ColumnMapping[], fixes: string[]) =>
    request<{ status: string }>(`/api/datasets/${id}/ingest`, { method: "POST", body: JSON.stringify({ mapping, fixes }) }, () => ({ status: "ingested" })),
  datasetHistory: () => request<T.UploadHistoryItem[]>("/api/datasets/history", undefined, preview.history),
  reports: () => request<T.ReportItem[]>("/api/reports", undefined, preview.reports),
  generateReport: (type: string, from: string, to: string) =>
    request<T.ReportItem>("/api/reports/generate", { method: "POST", body: JSON.stringify({ type, from, to }) }, () => ({
      id: `r-${Date.now()}`, type, from, to, created_at: new Date().toISOString(), status: "ready",
    })),
  reportUrl: (id: string, format: "pdf" | "csv") => (isPreviewMode ? undefined : `${API_BASE_URL}/api/reports/${id}/download${qs({ format })}`),
};
