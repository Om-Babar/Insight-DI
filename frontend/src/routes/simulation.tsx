import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Play } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { SimulationInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChartTooltip, EmptyState, ErrorState, LoadingBlock, NextStep, PageHeader, Panel, axisProps } from "@/components/app/primitives";

export const Route = createFileRoute("/simulation")({
  head: () => ({ meta: [
    { title: "What-If Simulation — InsightDI" },
    { name: "description", content: "Simulate the effect of price, discount, ad spend and restocking on your business." },
    { property: "og:title", content: "What-If Simulation — InsightDI" },
    { property: "og:description", content: "Simulate the effect of price, discount, ad spend and restocking on your business." },
  ] }),
  component: Simulation,
});

const fields: { k: keyof SimulationInput; l: string; min: number; max: number; step: number; unit: "currency" | "percent" | "number" }[] = [
  { k: "ad_spend", l: "Monthly ad spend", min: 0, max: 500000, step: 5000, unit: "currency" },
  { k: "price", l: "Average price", min: 200, max: 5000, step: 50, unit: "currency" },
  { k: "discount_pct", l: "Discount", min: 0, max: 50, step: 1, unit: "percent" },
  { k: "restock_units", l: "Restock units", min: 0, max: 10000, step: 100, unit: "number" },
];

function Simulation() {
  const [input, setInput] = useState<SimulationInput>({ ad_spend: 150000, price: 1499, discount_pct: 10, restock_units: 2000 });
  const sim = useMutation({ mutationFn: api.simulate });
  const r = sim.data;
  return (
    <>
      <PageHeader title="What-if simulation" description="Try changes safely and see the expected outcome before acting." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Your levers">
          <div className="space-y-6">
            {fields.map((f) => (
              <div key={f.k}>
                <div className="mb-2 flex justify-between text-sm"><span className="font-medium">{f.l}</span><span className="tabular font-semibold">{fmt(input[f.k], f.unit, false)}</span></div>
                <Slider min={f.min} max={f.max} step={f.step} value={[input[f.k]]} onValueChange={([v]) => setInput((s) => ({ ...s, [f.k]: v ?? 0 }))} />
              </div>
            ))}
            <Button className="w-full" onClick={() => sim.mutate(input)} disabled={sim.isPending}><Play className="size-4" /> {sim.isPending ? "Running…" : "Run simulation"}</Button>
          </div>
        </Panel>
        <div className="space-y-6 lg:col-span-2">
          {sim.isPending ? <Panel><LoadingBlock /></Panel> : sim.isError ? <Panel><ErrorState message={(sim.error as Error).message} onRetry={() => sim.mutate(input)} /></Panel> : !r ? (
            <Panel><EmptyState title="No simulation yet" description="Adjust the levers and press Run simulation to compare against today." /></Panel>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {([["Orders", "orders", "number"], ["Revenue", "revenue", "currency"], ["Profit", "profit", "currency"], ["Stockout risk", "stockout_probability", "percent"]] as const).map(([l, k, u]) => {
                  const b = r.baseline[k], s = r.simulated[k]; const ch = b ? ((s - b) / Math.abs(b)) * 100 : 0;
                  const good = k === "stockout_probability" ? ch <= 0 : ch >= 0;
                  return <div key={k} className="surface p-4"><p className="text-xs uppercase text-muted-foreground">{l}</p><p className="mt-1 font-display text-xl font-bold">{fmt(s, u)}</p><p className="text-xs text-muted-foreground">was {fmt(b, u)} · <span className={good ? "text-success" : "text-critical"}>{ch >= 0 ? "+" : ""}{ch.toFixed(1)}%</span></p></div>;
                })}
              </div>
              <Panel title="Impact by lever">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={r.impact}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} />
                    <Tooltip content={<ChartTooltip unit="currency" />} />
                    <Bar dataKey="value" name="Profit impact" radius={4}>{r.impact.map((i) => <Cell key={i.name} fill={i.value < 0 ? "var(--color-critical)" : "var(--color-success)"} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              {r.notes.length > 0 && <Panel title="Things to know"><ul className="space-y-1 text-sm text-muted-foreground">{r.notes.map((n) => <li key={n}>• {n}</li>)}</ul></Panel>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
