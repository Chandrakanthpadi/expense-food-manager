import { useEffect, useRef, useState } from "react";
import { CheckCheck, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interpretExpenseMessage } from "@/lib/aiService";

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  error?: boolean;
}

interface Props {
  selectedDate: string;
  onAdd: (amount: number, category: string, note: string, date?: string) => void;
}

export function ExpenseChat({ selectedDate, onAdd }: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const busyRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, sending]);

  const send = async () => {
    const text = draft.trim();
    if (!text || text.length > 500 || busyRef.current || !online) return;
    busyRef.current = true;
    setSending(true);
    setDraft("");
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "user", text }]);
    try {
      const expense = await interpretExpenseMessage(text);
      onAdd(expense.amount, expense.category, expense.note, selectedDate);
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: "assistant",
        text: `Added ₹${expense.amount.toFixed(2)} · ${expense.category}\n${expense.note}`,
      }]);
    } catch (error) {
      setDraft(text);
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: "assistant", error: true,
        text: error instanceof Error ? error.message : "Could not process this expense. Try again.",
      }]);
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium"><MessageCircle className="h-4 w-4 text-primary" />Expense chat</span>
        <span className="text-xs text-muted-foreground">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <div ref={transcriptRef} role="log" aria-label="Expense conversation" aria-live="polite" className="h-56 overflow-y-auto bg-muted/20 p-3 space-y-3">
        {messages.length === 0 && <div className="flex h-full items-center justify-center"><MessageCircle aria-hidden="true" className="h-10 w-10 text-muted-foreground/40" /></div>}
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm whitespace-pre-line break-words ${message.role === "user" ? "bg-primary text-primary-foreground" : message.error ? "bg-destructive/10 text-destructive" : "bg-background text-foreground border border-border"}`}>
              {message.text}
              {message.role === "assistant" && !message.error && <CheckCheck className="mt-1 h-4 w-4 text-primary" aria-label="Expense added" />}
            </div>
          </div>
        ))}
        {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />Categorizing…</div>}
      </div>
      {!online && <p role="status" className="border-t border-border px-3 py-2 text-sm text-muted-foreground">Expense chat needs internet. Manual entries still work offline.</p>}
      <form className="flex items-end gap-2 border-t border-border bg-background p-2" onSubmit={event => { event.preventDefault(); void send(); }}>
        <input aria-label="Expense message" placeholder="500 for chai" maxLength={500} value={draft} disabled={sending}
          onChange={event => setDraft(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        <Button type="submit" size="icon" title="Send expense" aria-label="Send expense" disabled={!draft.trim() || sending || !online}>
          {sending ? <Loader2 className="motion-safe:animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}