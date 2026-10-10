import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NextStep, PageHeader, Pill, PriorityPill, QueryState } from "@/components/app/primitives";

export const Route = createFileRoute("/recommendations")({
  head: () => ({ meta: [
    { title: "Recommendations — InsightDI" },
    { name: "description", content: "Prioritised actions with evidence, expected impact and confidence." },
    { property: "og:title", content: "Recommendations — InsightDI" },
    { property: "og:description", content: "Prioritised actions with evidence, expected impact and confidence." },
  ] }),
  component: Recs,
});

function Recs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["recommendations"], queryFn: api.recommendations });
  const [filter, setFilter] = useState<"open" | "accepted" | "dismissed" | "all">("open");
  const [searchParam, setSearchParam] = useState(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    return p.get("search") || p.get("segment") || "";
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Recommendation["status"] }) => api.updateRecommendation(id, status),
    onSuccess: (r) => { qc.setQueryData<Recommendation[]>(["recommendations"], (old) => old?.map((x) => (x.id === r.id ? r : x))); toast.success(r.status === "accepted" ? "Marked as accepted" : "Dismissed"); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <>
      <PageHeader
        title="Recommendations"
        description="What to do next, ranked by priority and expected impact."
        actions={
          <div className="flex items-center gap-2">
            {searchParam && (
              <Pill tone="ai">
                Focus: {searchParam}
              </Pill>
            )}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />
      <QueryState q={q} empty={(d) => !d.length}>{(d) => {
        const queryLower = searchParam.trim().toLowerCase();
        const baseList = d.filter((r) => filter === "all" || r.status === filter);
        const list = queryLower
          ? baseList.filter((r) =>
              r.action.toLowerCase().includes(queryLower) ||
              r.reason.toLowerCase().includes(queryLower) ||
              r.category.toLowerCase().includes(queryLower) ||
              r.evidence.some((e) => e.toLowerCase().includes(queryLower))
            )
          : baseList;

        const displayList = list.length > 0 ? list : baseList;
        if (!displayList.length) return <p className="py-10 text-center text-sm text-muted-foreground">Nothing here.</p>;
        return (
          <div className="space-y-4">
            {searchParam && list.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Showing all general recommendations (no specific recommendations found matching "{searchParam}").
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">{displayList.map((r) => (
            <article key={r.id} className="surface flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2"><PriorityPill p={r.priority} /><Pill tone="info">{r.category}</Pill><Pill tone="ai">{Math.round(r.confidence * 100)}% confident</Pill>{r.status !== "open" && <Pill tone={r.status === "dismissed" ? "neutral" : "good"}>{r.status}</Pill>}</div>
              <h3 className="mt-3 font-display text-base font-bold">{r.action}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{r.evidence.map((e) => <li key={e}>• {e}</li>)}</ul>
              <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success">Expected: {r.expected_impact}</p>
              {r.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, status: "accepted" })}><Check className="size-4" /> Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: "dismissed" })}><X className="size-4" /> Dismiss</Button>
                </div>
              )}
            </article>
          ))}</div>
          </div>
        );
      }}</QueryState>
    </>
  );
}
