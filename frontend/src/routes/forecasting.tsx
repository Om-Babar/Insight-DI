import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt, fullTime, shortDate } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartTooltip, NextStep, PageHeader, Panel, Pill, QueryState, axisProps } from "@/components/app/primitives";

export const Route = createFileRoute("/forecasting")({
  head: () => ({ meta: [
    { title: "Forecasting — InsightDI" },
    { name: "description", content: "Revenue and demand forecasts with confidence ranges and model comparison." },
    { property: "og:title", content: "Forecasting — InsightDI" },
    { property: "og:description", content: "Revenue and demand forecasts with confidence ranges and model comparison." },
  ] }),
  component: Forecasting,
});

function Forecasting() {
  const [horizon, setHorizon] = useState(30);
  const [model, setModel] = useState("auto");
  const q = useQuery({ queryKey: ["forecast", horizon, model], queryFn: () => api.forecast(horizon, model) });
  return (
    <>
      <PageHeader step="Step 2 · Understand" title="Forecasting" description="What revenue to expect, with a likely range."
        actions={<>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{[7, 30, 60, 90].map((h) => <SelectItem key={h} value={String(h)}>Next {h} days</SelectItem>)}</SelectContent></Select>
          <Select value={model} onValueChange={setModel}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["auto", "prophet", "xgboost", "arima"].map((m) => <SelectItem key={m} value={m}>{m === "auto" ? "Best model" : m.toUpperCase()}</SelectItem>)}</SelectContent></Select>
        </>} />
      <QueryState q={q}>{(d) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface p-5"><p className="text-xs uppercase text-muted-foreground">Expected revenue</p><p className="mt-2 font-display text-[28px] font-bold">{fmt(d.expected_total, "currency")}</p></div>
            <div className="surface p-5"><p className="text-xs uppercase text-muted-foreground">Change vs last period</p><p className={`mt-2 font-display text-[28px] font-bold ${d.expected_change_pct >= 0 ? "text-success" : "text-critical"}`}>{d.expected_change_pct >= 0 ? "+" : ""}{d.expected_change_pct.toFixed(1)}%</p></div>
            <div className="surface p-5"><p className="text-xs uppercase text-muted-foreground">Model used</p><p className="mt-2 font-display text-[28px] font-bold">{d.model}</p><p className="text-xs text-muted-foreground">Generated {fullTime(d.generated_at)}</p></div>
          </div>
          <Panel title="Forecast" subtitle={d.summary} className="mt-6">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={d.series.map((p) => ({ ...p, range: p.lower != null && p.upper != null ? [p.lower, p.upper] : null }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} />
                <Tooltip content={<ChartTooltip unit="currency" />} />
                <Area dataKey="range" name="Likely range" stroke="none" fill="var(--color-chart-2)" fillOpacity={0.15} />
                <Line dataKey="actual" name="Actual" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line dataKey="forecast" name="Forecast" stroke="var(--color-chart-2)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Model comparison" subtitle="Lower error is better" className="mt-6">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-2">Model</th><th>Error (MAPE)</th><th>RMSE</th><th>Fit (R²)</th><th /></tr></thead>
              <tbody>{d.models.map((m) => (
                <tr key={m.model} className="tabular border-b border-border last:border-0"><td className="py-2.5 font-medium">{m.model}</td><td>{m.mape.toFixed(1)}%</td><td>{fmt(m.rmse)}</td><td>{m.r2.toFixed(2)}</td><td>{m.selected && <Pill tone="good">Selected</Pill>}</td></tr>
              ))}</tbody>
            </table>
          </Panel>
        </>
      )}</QueryState>
      <NextStep to="/competition" label="Check the competition" description="See how your prices compare on Amazon and Flipkart." />
    </>
  );
}
