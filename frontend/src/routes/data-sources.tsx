import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fullTime } from "@/lib/format";
import type { ColumnMapping, DatasetProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, LoadingBlock, NextStep, PageHeader, Panel, Pill, QueryState } from "@/components/app/primitives";

export const Route = createFileRoute("/data-sources")({
  head: () => ({ meta: [
    { title: "Data Sources — InsightDI" },
    { name: "description", content: "Upload sales, product and inventory files, check quality and map columns." },
    { property: "og:title", content: "Data Sources — InsightDI" },
    { property: "og:description", content: "Upload sales, product and inventory files, check quality and map columns." },
  ] }),
  component: DataSources,
});

function DataSources() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [fixes, setFixes] = useState<string[]>([]);
  const history = useQuery({ queryKey: ["dataset-history"], queryFn: api.datasetHistory });
  const upload = useMutation({ mutationFn: api.uploadDataset, onSuccess: (p) => { setProfile(p); setMapping(p.mapping); setFixes(p.issues.filter((i) => i.fix).map((i) => i.fix!)); } });
  const ingest = useMutation({
    mutationFn: () => api.ingestDataset(profile!.id, mapping, fixes),
    onSuccess: () => { toast.success("Data imported — dashboards will update shortly"); setProfile(null); qc.invalidateQueries(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const pick = (f?: File) => {
    if (!f) return undefined;
    if (!/\.(csv|xlsx?|json)$/i.test(f.name)) return toast.error("Please upload a CSV, Excel or JSON file.");
    if (f.size > 50 * 1024 * 1024) return toast.error("File is larger than 50 MB.");
    upload.mutate(f);
    return undefined;
  };
  return (
    <>
      <PageHeader title="Data sources" description="Upload your business files. We'll detect what they are, check quality and map the columns." />
      {!profile && (
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`surface flex flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center ${drag ? "border-analytics bg-analytics-soft" : "border-border"}`}>
          {upload.isPending ? <div className="w-full max-w-md"><LoadingBlock height={60} /><p className="mt-2 text-sm text-muted-foreground">Analysing your file…</p></div> : (
            <>
              <Upload className="size-8 text-analytics" />
              <p className="font-display font-semibold">Drop a file here or browse</p>
              <p className="text-sm text-muted-foreground">CSV, Excel or JSON · up to 50 MB</p>
              <Button onClick={() => fileRef.current?.click()}>Choose file</Button>
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx,.json" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}
          {upload.isError && <ErrorState message={(upload.error as Error).message} />}
        </div>
      )}
      {profile && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="surface p-4"><p className="text-xs uppercase text-muted-foreground">File</p><p className="mt-1 truncate font-semibold">{profile.filename}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-muted-foreground">Detected as</p><p className="mt-1 font-semibold">{profile.detected_type} <span className="text-xs text-muted-foreground">({Math.round(profile.type_confidence * 100)}%)</span></p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-muted-foreground">Size</p><p className="mt-1 font-semibold">{profile.rows.toLocaleString()} rows · {profile.columns} cols</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-muted-foreground">Quality score</p><p className={`mt-1 font-display text-xl font-bold ${profile.quality_score >= 80 ? "text-success" : profile.quality_score >= 60 ? "text-warning" : "text-critical"}`}>{profile.quality_score}/100</p></div>
          </div>
          <Panel title="Column mapping" subtitle="Check that each column points to the right field">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-2">Your column</th><th>Sample</th><th>Maps to</th><th>Confidence</th></tr></thead>
              <tbody>{mapping.map((m, i) => (
                <tr key={m.source_column} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{m.source_column}</td><td className="text-muted-foreground">{m.sample}</td>
                  <td className="py-2"><Select value={m.target_field ?? "__skip"} onValueChange={(v) => setMapping((arr) => arr.map((x, j) => (j === i ? { ...x, target_field: v === "__skip" ? null : v } : x)))}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__skip">Skip column</SelectItem>{profile.target_fields.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></td>
                  <td><Pill tone={m.confidence >= 0.8 ? "good" : m.confidence >= 0.5 ? "warning" : "critical"}>{Math.round(m.confidence * 100)}%</Pill></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Panel>
          <Panel title="Quality issues" subtitle="Tick the fixes you want us to apply">
            {profile.issues.length ? <ul className="space-y-3">{profile.issues.map((iss, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                {iss.fix ? <Checkbox checked={fixes.includes(iss.fix)} onCheckedChange={(c) => setFixes((f) => (c ? [...f, iss.fix!] : f.filter((x) => x !== iss.fix)))} className="mt-0.5" /> : <span className="size-4" />}
                <div><p className="font-medium">{iss.detail} <span className="text-muted-foreground">({iss.count.toLocaleString()})</span></p>{iss.fix && <p className="text-xs text-muted-foreground">Fix: {iss.fix}</p>}</div>
              </li>
            ))}</ul> : <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> No issues found.</p>}
          </Panel>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProfile(null)}>Cancel</Button>
            <Button onClick={() => ingest.mutate()} disabled={ingest.isPending}>{ingest.isPending ? "Importing…" : "Import data"}</Button>
          </div>
        </div>
      )}
      <Panel title="Upload history" className="mt-6">
        <QueryState q={history} empty={(d) => !d.length}>{(d) => (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-2">File</th><th>Type</th><th>Rows</th><th>Quality</th><th>Status</th><th>Uploaded</th></tr></thead>
            <tbody>{d.map((h) => (
              <tr key={h.id} className="tabular border-b border-border last:border-0"><td className="py-2.5 font-medium">{h.filename}</td><td>{h.detected_type}</td><td>{h.rows.toLocaleString()}</td><td>{h.quality_score}</td>
                <td><Pill tone={h.status === "ingested" ? "good" : h.status === "failed" ? "critical" : "warning"}>{h.status.replace("_", " ")}</Pill></td><td className="text-muted-foreground">{fullTime(h.uploaded_at)}</td></tr>
            ))}</tbody>
          </table></div>
        )}</QueryState>
      </Panel>
    </>
  );
}
