import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { fmt, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChartTooltip, Freshness, NextStep, PageHeader, Panel, Pill, QueryState, SeverityIcon, axisProps } from "@/components/app/primitives";

export const Route = createFileRoute("/competition")({
  head: () => ({ meta: [
    { title: "Competitive Intelligence — InsightDI" },
    { name: "description", content: "Compare your prices, ratings and stock against Amazon and Flipkart." },
    { property: "og:title", content: "Competitive Intelligence — InsightDI" },
    { property: "og:description", content: "Compare your prices, ratings and stock against Amazon and Flipkart." },
  ] }),
  component: Competition,
});

function Competition() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["competition"], queryFn: api.competition });
  const [sku, setSku] = useState<string | null>(null);
  const refresh = useMutation({ mutationFn: api.refreshCompetition, onSuccess: () => { toast.success("Price collection started"); qc.invalidateQueries({ queryKey: ["competition"] }); }, onError: (e) => toast.error((e as Error).message) });
  return (
    <>
      <PageHeader title="Competitive intelligence" description="How your products stack up on Amazon and Flipkart."
        actions={<Button onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw className={refresh.isPending ? "size-4 animate-spin" : "size-4"} /> Refresh prices</Button>} />
      <QueryState q={q} empty={(d) => !d.products.length}>{(d) => {
        const sel = d.products.find((p) => p.sku === sku) ?? d.products[0]!;
        return (
          <>
            <div className="mb-6 flex flex-wrap gap-4">{d.sources.map((s) => <div key={s.platform} className="surface px-4 py-3"><Freshness source={s.platform} at={s.last_collected} status={s.status} /><p className="mt-1 text-xs text-muted-foreground">{s.products} products tracked</p></div>)}</div>
            {d.alerts.length > 0 && <div className="mb-6 space-y-3">{d.alerts.map((a) => <div key={a.id} className="surface flex gap-3 p-4"><SeverityIcon severity={a.severity} /><div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.detail}</p></div></div>)}</div>}
            <Panel title="Price comparison" subtitle="Select a product to see its price history">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-2">Product</th><th>Your price</th><th>Amazon</th><th>Flipkart</th><th>Rating</th><th>Position</th></tr></thead>
                  <tbody>{d.products.map((p) => {
                    const a = p.listings.find((l) => l.platform === "amazon"); const f = p.listings.find((l) => l.platform === "flipkart");
                    return (
                      <tr key={p.sku} onClick={() => setSku(p.sku)} className={`tabular cursor-pointer border-b border-border last:border-0 hover:bg-muted ${sel.sku === p.sku ? "bg-analytics-soft" : ""}`}>
                        <td className="py-2.5 font-medium">{p.name}</td><td>{fmt(p.our_price, "currency", false)}</td>
                        <td>{a?.price != null ? fmt(a.price, "currency", false) : "—"}</td><td>{f?.price != null ? fmt(f.price, "currency", false) : "—"}</td>
                        <td>{p.our_rating.toFixed(1)}★</td>
                        <td><Pill tone={p.position === "cheapest" ? "good" : p.position === "competitive" ? "info" : "critical"}>{p.position}</Pill></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </Panel>
            <Panel title={`Price history — ${sel.name}`} className="mt-6">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sel.price_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                  <YAxis {...axisProps} width={60} tickFormatter={(v) => fmt(v, "currency")} domain={["auto", "auto"]} />
                  <Tooltip content={<ChartTooltip unit="currency" />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="ours" name="You" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="amazon" name="Amazon" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                  <Line dataKey="flipkart" name="Flipkart" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </>
        );
      }}</QueryState>
    </>
  );
}
