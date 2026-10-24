import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Loan } from "@/hooks/useLifeData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  loans: Loan[];
  selectedDate: string;
  onAdd: (person: string, amount: number, kind: Loan["kind"], note: string, date?: string) => void;
  onRemove: (id: string) => void;
}

/** Net per person, all time: money they owe me (lent + returned) minus money I owe them (borrowed + repaid). */
export function loanBalances(loans: Loan[]) {
  const map = new Map<string, { person: string; lent: number; repaid: number; borrowed: number; returned: number }>();
  for (const l of loans) {
    const key = l.person.trim().toLowerCase();
    const row = map.get(key) ?? { person: l.person.trim(), lent: 0, repaid: 0, borrowed: 0, returned: 0 };
    row[l.kind] += l.amount;
    map.set(key, row);
  }
  return [...map.values()]
    .map(r => ({ ...r, due: r.lent + r.returned - r.repaid - r.borrowed }))
    .sort((a, b) => b.due - a.due);
}

export function LoansTracker({ loans, selectedDate, onAdd, onRemove }: Props) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<Loan["kind"]>("lent");
  const [note, setNote] = useState("");

  const balances = useMemo(() => loanBalances(loans), [loans]);
  const people = balances.map(b => b.person);
  const totalDue = balances.reduce((s, b) => s + Math.max(0, b.due), 0);
  const totalOwed = balances.reduce((s, b) => s + Math.max(0, -b.due), 0);
  const dayLoans = loans.filter(l => l.date === selectedDate);

  const handleAdd = () => {
    const num = parseFloat(amount);
    if (!person.trim() || !num || num <= 0) return;
    const existing = people.find(p => p.toLowerCase() === person.trim().toLowerCase());
    onAdd(existing ?? person.trim(), num, kind, note.trim(), selectedDate);
    setAmount(""); setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">To get back</span>
        <span className="text-lg font-semibold tabular-nums">₹{totalDue.toFixed(2)}</span>
      </div>
      {totalOwed > 0 && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">I owe</span>
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">₹{totalOwed.toFixed(2)}</span>
        </div>
      )}

      {balances.length > 0 && (
        <ul className="divide-y divide-border/40 rounded-lg border border-border/40">
          {balances.map(b => (
            <li key={b.person} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-medium truncate">{b.person}</span>
              <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                {b.borrowed > 0 ? `gave ₹${b.lent.toFixed(0)} · took ₹${b.borrowed.toFixed(0)}` : `lent ₹${b.lent.toFixed(0)} · back ₹${b.repaid.toFixed(0)}`}
              </span>
              <span className={cn("tabular-nums font-semibold w-24 text-right", b.due <= 0 && "text-muted-foreground")}>
                {b.due > 0 ? `₹${b.due.toFixed(0)}` : b.due < 0 ? `owe ₹${(-b.due).toFixed(0)}` : "Settled"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1" role="tablist" aria-label="Loan type">
        <Button variant={kind === "lent" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={kind === "lent"} onClick={() => setKind("lent")}>I lent</Button>
        <Button variant={kind === "repaid" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={kind === "repaid"} onClick={() => setKind("repaid")}>Paid back</Button>
        <Button variant={kind === "borrowed" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={kind === "borrowed"} onClick={() => setKind("borrowed")}>I borrowed</Button>
        <Button variant={kind === "returned" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={kind === "returned"} onClick={() => setKind("returned")}>I returned</Button>
      </div>
      <div className="flex gap-2">
        <input list="loan-people" placeholder="Person" value={person} onChange={e => setPerson(e.target.value)} maxLength={40}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        <datalist id="loan-people">{people.map(p => <option key={p} value={p} />)}</datalist>
        <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
          className="w-28 bg-muted rounded-md px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)}
          className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <button onClick={handleAdd} aria-label="Add loan entry" className="bg-section-expense text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayLoans.length > 0 && (
        <ul className="space-y-2">
          {dayLoans.map(l => (
            <li key={l.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/40 text-sm">
              <span className="flex-1 truncate">
                {l.kind === "lent" ? `Lent to ${l.person}` : l.kind === "repaid" ? `${l.person} paid back` : l.kind === "borrowed" ? `Borrowed from ${l.person}` : `Returned to ${l.person}`}
                {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
              </span>
              <span className="tabular-nums font-semibold">₹{l.amount.toFixed(2)}</span>
              <button onClick={() => onRemove(l.id)} aria-label="Delete loan entry" className="p-1 text-muted-foreground hover:text-destructive active:scale-90">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
