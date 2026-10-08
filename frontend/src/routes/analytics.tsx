import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import type { AnalyticsSection } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartTooltip, KpiGrid, NextStep, PageHeader, Panel, QueryState, axisProps } from "@/components/app/primitives";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [
    { title: "Business Analytics — InsightDI" },
    { name: "description", content: "Sales, products, customers, inventory and marketing performance." },
    { property: "og:title", content: "Business Analytics — InsightDI" },
    { property: "og:description", content: "Sales, products, customers, inventory and marketing performance." },
  ] }),
  component: Analytics,
});

const sections: { v: AnalyticsSection; l: string }[] = [
  { v: "sales", l: "Sales" }, { v: "products", l: "Products" }, { v: "customers", l: "Customers" }, { v: "inventory", l: "Inventory" }, { v: "marketing", l: "Marketing" },
];
const colors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"];

function Analytics() {
  const [section, setSection] = useState<AnalyticsSection>("sales");
  const [range, setRange] = useState("30d");
  const q = useQuery({ queryKey: ["analytics", section, range], queryFn: () => api.analytics(section, range) });
  return (
    <>
      <PageHeader title="Business analytics" description="Explore performance across every part of the business."
        actions={<Select value={range} onValueChange={setRange}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="90d">Last 90 days</SelectItem></SelectContent></Select>} />
      <Tabs value={section} onValueChange={(v) => setSection(v as AnalyticsSection)} className="mb-6">
        <TabsList className="flex-wrap">{sections.map((s) => <TabsTrigger key={s.v} value={s.v}>{s.l}</TabsTrigger>)}</TabsList>
      </Tabs>
      <KpiGrid kpis={q.data?.kpis} />
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Trend" className="lg:col-span-3">
          <QueryState q={q}>{(d) => (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, d.trend_keys[0]?.unit)} />
                <Tooltip content={<ChartTooltip unit={d.trend_keys[0]?.unit} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {d.trend_keys.map((k, i) => <Line key={k.key} dataKey={k.key} name={k.label} stroke={colors[i % 3]} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          )}</QueryState>
        </Panel>
        <Panel title={q.data?.breakdown_label ?? "Breakdown"} className="lg:col-span-2">
          <QueryState q={q}>{(d) => (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.breakdown} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" {...axisProps} tickFormatter={(v) => fmt(v, d.breakdown_unit)} />
                <YAxis type="category" dataKey="name" {...axisProps} width={90} />
                <Tooltip content={<ChartTooltip unit={d.breakdown_unit} />} />
                <Bar dataKey="value" name={d.breakdown_label} fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}</QueryState>
        </Panel>
      </div>
      <Panel title="Details" className="mt-6">
        <QueryState q={q} empty={(d) => !d.table.rows.length}>{(d) => (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">{d.table.columns.map((c) => <th key={c.key} className="py-2 pr-4 font-medium">{c.label}</th>)}</tr></thead>
              <tbody>{d.table.rows.map((r, i) => <tr key={i} className="border-b border-border last:border-0">{d.table.columns.map((c) => <td key={c.key} className="tabular py-2.5 pr-4">{c.unit ? fmt(Number(r[c.key]), c.unit) : r[c.key]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}</QueryState>
      </Panel>
    </>
  );
}
