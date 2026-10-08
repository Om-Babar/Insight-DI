import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { api } from "@/lib/api";
import type { CopilotAnswer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Pill, SourceChips } from "@/components/app/primitives";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [
    { title: "AI Copilot — InsightDI" },
    { name: "description", content: "Ask questions about your business and get answers backed by your data." },
    { property: "og:title", content: "AI Copilot — InsightDI" },
    { property: "og:description", content: "Ask questions about your business and get answers backed by your data." },
  ] }),
  component: Copilot,
});

const suggestions = ["Why did revenue drop last week?", "Which products should I restock?", "Am I priced higher than Amazon?", "What should I focus on this month?"];
type Msg = { role: "user"; text: string } | { role: "ai"; a: CopilotAnswer } | { role: "error"; text: string };

function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const ask = useMutation({ mutationFn: api.copilot, onSuccess: (a) => setMsgs((m) => [...m, { role: "ai", a }]), onError: (e) => setMsgs((m) => [...m, { role: "error", text: (e as Error).message }]) });
  const send = (qText: string) => { const t = qText.trim(); if (!t || ask.isPending) return; setMsgs((m) => [...m, { role: "user", text: t }]); setText(""); ask.mutate(t); };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); send(text); };
  return (
    <>
      <PageHeader title="AI copilot" description="Ask anything about your business in plain language." />
      <div className="surface flex h-[calc(100vh-14rem)] min-h-[480px] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!msgs.length && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-ai-soft text-ai"><Sparkles className="size-6" /></span>
              <p className="mt-3 font-display text-lg font-bold">What would you like to know?</p>
              <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">{suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted">{s}</button>)}</div>
            </div>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end gap-2"><p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</p><User className="mt-2 size-4 text-muted-foreground" /></div>
          ) : m.role === "error" ? (
            <p key={i} className="rounded-lg bg-critical-soft px-4 py-2.5 text-sm text-critical">{m.text}</p>
          ) : (
            <div key={i} className="flex gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai"><Bot className="size-4" /></span>
              <div className="max-w-[85%] space-y-3 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                <p className="whitespace-pre-line text-sm">{m.a.answer}</p>
                {m.a.highlights.length > 0 && <div className="flex flex-wrap gap-2">{m.a.highlights.map((h) => <Pill key={h.label} tone={h.tone === "good" ? "good" : h.tone === "warning" ? "warning" : h.tone === "critical" ? "critical" : "neutral"}>{h.label}: {h.value}</Pill>)}</div>}
                <SourceChips sources={m.a.sources} />
                {m.a.next_steps.length > 0 && <div className="flex flex-wrap gap-2">{m.a.next_steps.map((n) => <Link key={n.to + n.label} to={n.to} className="text-xs font-semibold text-analytics hover:underline">{n.label} →</Link>)}</div>}
              </div>
            </div>
          ))}
          {ask.isPending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Bot className="size-4 animate-pulse text-ai" /> Thinking…</p>}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} placeholder="Ask about sales, stock, pricing…" rows={1} className="min-h-10 resize-none" />
          <Button type="submit" disabled={!text.trim() || ask.isPending} aria-label="Send"><Send className="size-4" /></Button>
        </form>
      </div>
    </>
  );
}
