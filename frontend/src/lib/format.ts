export type Unit = "currency" | "number" | "percent";

export function fmt(v: number | null | undefined, unit: Unit = "number", compact = true): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (unit === "percent") return `${v.toFixed(1)}%`;
  if (unit === "currency") {
    if (compact && Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (compact && Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
    if (compact && Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
    return `₹${Math.round(v).toLocaleString("en-IN")}`;
  }
  if (compact && Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(2);
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const shortDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const fullTime = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
