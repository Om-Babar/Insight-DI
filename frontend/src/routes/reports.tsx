import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fullTime } from "@/lib/format";
import type { ReportItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Pill, QueryState } from "@/components/app/primitives";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [
    { title: "Reports — InsightDI" },
    { name: "description", content: "Generate and download business reports as PDF or CSV." },
    { property: "og:title", content: "Reports — InsightDI" },
    { property: "og:description", content: "Generate and download business reports as PDF or CSV." },
  ] }),
  component: Reports,
});

function Reports() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reports"], queryFn: api.reports });
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [type, setType] = useState("Executive summary");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const gen = useMutation({
    mutationFn: () => api.generateReport(type, from, to),
    onSuccess: (r) => { qc.setQueryData<ReportItem[]>(["reports"], (old) => [r, ...(old ?? [])]); toast.success("Report ready"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const download = (id: string, f: "pdf" | "csv") => { const u = api.reportUrl(id, f); if (u) window.open(u, "_blank"); else toast.info("Downloads work once the server is connected."); };
  return (
    <>
      <PageHeader title="Reports" description="Create shareable reports for any period." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="New report">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Report type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Executive summary", "Sales performance", "Inventory health", "Competitive pricing", "Forecast"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="from">From</Label><Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="to">To</Label><Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={() => gen.mutate()} disabled={gen.isPending || from > to}><FileText className="size-4" /> {gen.isPending ? "Generating…" : "Generate report"}</Button>
          </div>
        </Panel>
        <Panel title="Your reports" className="lg:col-span-2">
          <QueryState q={q} empty={(d) => !d.length}>{(d) => (
            <ul className="divide-y divide-border">{d.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div><p className="text-sm font-medium">{r.type}</p><p className="text-xs text-muted-foreground">{r.from} → {r.to} · created {fullTime(r.created_at)}</p></div>
                {r.status === "ready" ? (
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => download(r.id, "pdf")}><Download className="size-3.5" /> PDF</Button><Button size="sm" variant="outline" onClick={() => download(r.id, "csv")}><Download className="size-3.5" /> CSV</Button></div>
                ) : <Pill tone={r.status === "failed" ? "critical" : "warning"}>{r.status}</Pill>}
              </li>
            ))}</ul>
          )}</QueryState>
        </Panel>
      </div>
    </>
  );
}
