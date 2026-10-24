import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import type { Expense } from "@/hooks/useLifeData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExpenseChat } from "@/components/ExpenseChat";
import { expenseCategories } from "../../supabase/functions/ai-insights/expense-parser";

const categories = expenseCategories;

interface Props {
  expenses: Expense[];
  selectedDate: string;
  onAdd: (amount: number, category: string, note: string, date?: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Expense>) => void;
}

export function ExpenseTracker({ expenses, selectedDate, onAdd, onRemove, onUpdate }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [entryMode, setEntryMode] = useState<"chat" | "manual">("chat");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");


  const dayExpenses = expenses.filter(e => e.date === selectedDate);
  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onAdd(num, category, note, selectedDate);
    setAmount("");
    setNote("");
  };

  const startEditing = (e: Expense) => {
    setEditingId(e.id);
    setEditAmount(e.amount.toString());
    setEditCategory(e.category);
    setEditNote(e.note || "");
  };

  const handleUpdate = (id: string) => {
    const num = parseFloat(editAmount);
    if (!num || num <= 0) return;
    onUpdate(id, {
      amount: num,
      category: editCategory,
      note: editNote
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Spending</span>
        <span className="text-lg font-semibold tabular-nums">₹{dayTotal.toFixed(2)}</span>
      </div>

      <div className="flex gap-1" role="tablist" aria-label="Expense entry mode">
        <Button variant={entryMode === "chat" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={entryMode === "chat"} onClick={() => setEntryMode("chat")}>Chat</Button>
        <Button variant={entryMode === "manual" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={entryMode === "manual"} onClick={() => setEntryMode("manual")}>Manual</Button>
      </div>

      {entryMode === "chat" ? <ExpenseChat key={selectedDate} selectedDate={selectedDate} onAdd={onAdd} /> : <>
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

      </>}

      {dayExpenses.length > 0 && (
        <ul className="space-y-2 pt-1">
          {dayExpenses.map(e => (
            <li key={e.id} className="flex flex-col rounded-lg bg-muted/20 border border-border/40 overflow-hidden group">
              <div
                className="flex items-center gap-2 p-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                onClick={() => editingId === e.id ? setEditingId(null) : startEditing(e)}
              >
                <span className="w-2 h-2 rounded-full bg-section-expense shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{e.note || e.category}</span>
                <span className="text-muted-foreground text-[10px] px-1.5 py-0.5 bg-muted/50 rounded-md border border-border/20">
                  {e.category}
                </span>
                <span className="tabular-nums font-semibold text-sm">₹{e.amount.toFixed(2)}</span>
                <button
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onRemove(e.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1 active:scale-90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", editingId === e.id && "rotate-180")} />
              </div>

              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: editingId === e.id ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="p-3 pt-0 space-y-3">
                    <div className="h-px bg-border/20 mx-1" />
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground font-medium px-1">Amount</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={evt => setEditAmount(evt.target.value)}
                          className="w-full bg-background rounded-md px-2 py-1.5 text-sm tabular-nums outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                          onClick={evt => evt.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground font-medium px-1">Category</label>
                        <select
                          value={editCategory}
                          onChange={evt => setEditCategory(evt.target.value)}
                          className="w-full bg-background rounded-md px-2 py-1.5 text-sm outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                          onClick={evt => evt.stopPropagation()}
                        >
                          {categories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-medium px-1">Note</label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={evt => setEditNote(evt.target.value)}
                        placeholder="Note"
                        className="w-full bg-background rounded-md px-2 py-1.5 text-sm outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                        onClick={evt => evt.stopPropagation()}
                      />
                    </div>
                    <div className="flex justify-end items-center pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setEditingId(null);
                          }}
                          className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handleUpdate(e.id);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold bg-section-expense text-primary-foreground rounded-md shadow-sm active:scale-95 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
