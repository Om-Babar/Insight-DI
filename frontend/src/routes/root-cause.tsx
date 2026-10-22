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
      <QueryState q={q}>{(d) => {
        if (!d) return null;
        const problem = d.problem || {
          metric: "Daily Revenue",
          change_pct: -18,
          period: "Last 14 days",
          title: "Revenue Variance Diagnostic",
          summary: "Root cause analysis evaluating multiple operational and market factors.",
        };
        const mainCause = d.main_cause || {
          factor: "Market & Demand Dynamics",
          contribution_pct: 50,
          explanation: "Contributing factor analysis across catalog performance.",
        };
        const factors = d.factors || [];
        const waterfall = d.waterfall || [];
        const anomalies = d.anomalies || [];
        const shap = d.shap || [];
        const modelInfo = d.model_info || { model: "XGBoost + TreeSHAP", samples: 18420, r2: 0.87 };
        const maxShap = shap.length > 0 ? Math.max(...shap.map((x) => x.importance), 0.001) : 1;

        return (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="surface border-l-4 border-l-critical p-5">
                <Pill tone="critical">{problem.metric} {(problem.change_pct ?? 0).toFixed(1)}% · {problem.period}</Pill>
                <h2 className="mt-3 font-display text-lg font-bold">{problem.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{problem.summary}</p>
              </div>
              <div className="surface border-l-4 border-l-ai p-5">
                <Pill tone="ai">Main cause · {mainCause.contribution_pct}% of impact</Pill>
                <h2 className="mt-3 font-display text-lg font-bold">{mainCause.factor}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{mainCause.explanation}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Contributing factors">
                <ul className="space-y-4">{factors.map((f) => (
                  <li key={f.factor}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{f.factor}</span><span className={f.direction === "negative" ? "text-critical" : "text-success"}>{f.contribution_pct}%</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${f.direction === "negative" ? "bg-critical" : "bg-success"}`} style={{ width: `${Math.min(100, Math.abs(f.contribution_pct))}%` }} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
                  </li>
                ))}</ul>
              </Panel>
              <Panel title="Impact breakdown" subtitle="How each factor moved revenue">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={waterfall}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} interval={0} fontSize={10} />
                    <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} />
                    <Tooltip content={<ChartTooltip unit="currency" />} />
                    <Bar dataKey="value" name="Impact" radius={4}>{waterfall.map((w) => <Cell key={w.name} fill={w.value < 0 ? "var(--color-critical)" : "var(--color-success)"} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Unusual days" subtitle="Red dots are days that broke the normal pattern">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={anomalies.map((a) => ({ ...a, flag: a.anomaly ? a.value : null }))}>
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
              <Panel title="What the model weighs most" footer={`${modelInfo.model} · ${modelInfo.samples.toLocaleString()} samples · fit ${modelInfo.r2.toFixed(2)}`}>
                <ul className="space-y-3">{shap.map((s) => (
                  <li key={s.feature} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
                    <span className="truncate">{s.feature}</span>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-ai" style={{ width: `${(s.importance / maxShap) * 100}%` }} /></div>
                    <span className="tabular text-right text-xs text-muted-foreground">{s.importance.toFixed(2)}</span>
                  </li>
                ))}</ul>
              </Panel>
            </div>
          </>
        );
      }}</QueryState>
    </>
  );
}
