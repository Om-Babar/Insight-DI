import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import { ChartTooltip, NextStep, PageHeader, Panel, Pill, QueryState, axisProps } from "@/components/app/primitives";

export const Route = createFileRoute("/root-cause")({
  head: () => ({ meta: [
    { title: "Root Cause Analysis — InsightDI" },
    { name: "description", content: "Understand what is driving changes in your key business metrics." },
    { property: "og:title", content: "Root Cause Analysis — InsightDI" },
    { property: "og:description", content: "Understand what is driving changes in your key business metrics." },
  ] }),
  component: RootCause,
});

function RootCause() {
  const q = useQuery({ queryKey: ["rca"], queryFn: api.rca });
  const productFocus = typeof window !== "undefined" ? (() => {
    const p = new URLSearchParams(window.location.search);
    const sku = p.get("sku");
    const name = p.get("name");
    const metric = p.get("metric");
    if (sku || name) return { title: `${name || sku} (${sku})` };
    if (metric) return { title: metric === "retention" ? "Customer Retention" : metric.toUpperCase() };
    return null;
  })() : null;

  return (
    <>
      <PageHeader
        title="Root cause analysis"
        description="Why your numbers changed, ranked by impact."
        actions={
          productFocus ? (
            <Pill tone="ai">
              Diagnostic Focus: {productFocus.title}
            </Pill>
          ) : undefined
        }
      />
      <QueryState q={q}>{(d) => (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface border-l-4 border-l-critical p-5">
              <Pill tone="critical">{d.problem.metric} {d.problem.change_pct.toFixed(1)}% · {d.problem.period}</Pill>
              <h2 className="mt-3 font-display text-lg font-bold">{d.problem.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d.problem.summary}</p>
            </div>
            <div className="surface border-l-4 border-l-ai p-5">
              <Pill tone="ai">Main cause · {d.main_cause.contribution_pct}% of impact</Pill>
              <h2 className="mt-3 font-display text-lg font-bold">{d.main_cause.factor}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d.main_cause.explanation}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Contributing factors">
              <ul className="space-y-4">{d.factors.map((f) => (
                <li key={f.factor}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{f.factor}</span><span className={f.direction === "negative" ? "text-critical" : "text-success"}>{f.contribution_pct}%</span></div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${f.direction === "negative" ? "bg-critical" : "bg-success"}`} style={{ width: `${Math.min(100, Math.abs(f.contribution_pct))}%` }} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
                </li>
              ))}</ul>
            </Panel>
            <Panel title="Impact breakdown" subtitle="How each factor moved revenue">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={d.waterfall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" {...axisProps} interval={0} fontSize={10} />
                  <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} />
                  <Tooltip content={<ChartTooltip unit="currency" />} />
                  <Bar dataKey="value" name="Impact" radius={4}>{d.waterfall.map((w) => <Cell key={w.name} fill={w.value < 0 ? "var(--color-critical)" : "var(--color-success)"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Unusual days" subtitle="Red dots are days that broke the normal pattern">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={d.anomalies.map((a) => ({ ...a, flag: a.anomaly ? a.value : null }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                  <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} />
                  <Tooltip content={<ChartTooltip unit="currency" />} />
                  <Line dataKey="expected" name="Expected" stroke="var(--color-muted-foreground)" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="value" name="Actual" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Scatter dataKey="flag" name="Unusual" fill="var(--color-critical)" />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="What the model weighs most" footer={`${d.model_info.model} · ${d.model_info.samples.toLocaleString()} samples · fit ${d.model_info.r2.toFixed(2)}`}>
              <ul className="space-y-3">{d.shap.map((s) => (
                <li key={s.feature} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
                  <span className="truncate">{s.feature}</span>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-ai" style={{ width: `${(s.importance / Math.max(...d.shap.map((x) => x.importance))) * 100}%` }} /></div>
                  <span className="tabular text-right text-xs text-muted-foreground">{s.importance.toFixed(2)}</span>
                </li>
              ))}</ul>
            </Panel>
          </div>
        </>
      )}</QueryState>
    </>
  );
}
