import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Expense } from "@/hooks/useLifeData";

const categories = ["Food", "Transport", "Bills", "Shopping", "Health", "Other"];

interface Props {
  expenses: Expense[];
  selectedDate: string;
  onAdd: (amount: number, category: string, note: string, date?: string) => void;
  onRemove: (id: string) => void;
}

export function ExpenseTracker({ expenses, selectedDate, onAdd, onRemove }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");

  const dayExpenses = expenses.filter(e => e.date === selectedDate);
  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onAdd(num, category, note, selectedDate);
    setAmount("");
    setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Spending</span>
        <span className="text-lg font-semibold tabular-nums">${dayTotal.toFixed(2)}</span>
      </div>

      <div className="flex gap-2">
        <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-muted rounded-md px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)}
          className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <button onClick={handleAdd} className="bg-section-expense text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayExpenses.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {dayExpenses.map(e => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-section-expense/60 shrink-0" />
              <span className="flex-1 truncate">{e.note || e.category}</span>
              <span className="text-muted-foreground text-xs">{e.category}</span>
              <span className="tabular-nums font-medium">${e.amount.toFixed(2)}</span>
              <button onClick={() => onRemove(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
