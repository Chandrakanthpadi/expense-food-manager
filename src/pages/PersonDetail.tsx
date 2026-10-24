import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HandCoins, X } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { cn } from "@/lib/utils";

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const KIND_LABEL: Record<string, string> = {
  lent: "Lent",
  repaid: "Paid back",
  borrowed: "Borrowed",
  returned: "Returned",
};

const PersonDetail = () => {
  const navigate = useNavigate();
  const { person } = useParams<{ person: string }>();
  const name = decodeURIComponent(person ?? "");
  const life = useLifeData();
  const { data } = life;

  const loans = useMemo(
    () => data.loans
      .filter(l => l.person.trim().toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data.loans, name]
  );

  const taggedExpenses = useMemo(
    () => data.expenses
      .filter(e => e.person && e.person.trim().toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data.expenses, name]
  );

  const lent = loans.filter(l => l.kind === "lent").reduce((s, l) => s + l.amount, 0);
  const repaid = loans.filter(l => l.kind === "repaid").reduce((s, l) => s + l.amount, 0);
  const borrowed = loans.filter(l => l.kind === "borrowed").reduce((s, l) => s + l.amount, 0);
  const returned = loans.filter(l => l.kind === "returned").reduce((s, l) => s + l.amount, 0);
  const due = lent + returned - repaid - borrowed;
  const spentOn = taggedExpenses.reduce((s, e) => s + e.amount, 0);

  // Group loans by date, newest first
  const loansByDate = useMemo(() => {
    const map = new Map<string, typeof loans>();
    for (const l of loans) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return [...map.entries()];
  }, [loans]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-section-expense text-primary-foreground shrink-0">
              <HandCoins className="w-4 h-4" />
            </span>
            <h1 className="text-lg font-bold truncate">{name}</h1>
          </div>
        </div>

        {/* Balance summary */}
        <div className="bg-card rounded-xl border border-border/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Net balance</span>
            <span className={cn("text-xl font-bold tabular-nums", due <= 0 && "text-muted-foreground")}>
              {due > 0 ? `₹${due.toFixed(2)} to get back` : due < 0 ? `You owe ₹${(-due).toFixed(2)}` : "Settled"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-muted-foreground">You lent</p>
              <p className="font-semibold tabular-nums">₹{lent.toFixed(2)}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-muted-foreground">Paid back</p>
              <p className="font-semibold tabular-nums">₹{repaid.toFixed(2)}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-muted-foreground">You borrowed</p>
              <p className="font-semibold tabular-nums">₹{borrowed.toFixed(2)}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-muted-foreground">You returned</p>
              <p className="font-semibold tabular-nums">₹{returned.toFixed(2)}</p>
            </div>
          </div>
          {spentOn > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Also spent <span className="font-semibold text-foreground tabular-nums">₹{spentOn.toFixed(2)}</span> on {name} (counted in expenses, not in the balance above).
            </p>
          )}
        </div>

        {/* Loan transactions */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-base font-semibold">Lend & borrow transactions</h2>
          </div>
          <div className="p-4 space-y-4">
            {loansByDate.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">No transactions with {name} yet.</p>
            )}
            {loansByDate.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{fmtDate(date)}</p>
                <ul className="space-y-2">
                  {items.map(l => (
                    <li key={l.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/40 text-sm">
                      <span className="flex-1 truncate">
                        {KIND_LABEL[l.kind] ?? l.kind}
                        {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
                      </span>
                      <span className="tabular-nums font-semibold">₹{l.amount.toFixed(2)}</span>
                      <button onClick={() => life.removeLoan(l.id)} aria-label="Delete loan entry" className="p-1 text-muted-foreground hover:text-destructive active:scale-90">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses tagged with this person */}
        {taggedExpenses.length > 0 && (
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40">
              <h2 className="text-base font-semibold">Expenses for {name}</h2>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {taggedExpenses.map(e => (
                  <li key={e.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/40 text-sm">
                    <span className="flex-1 truncate">
                      {e.note || e.category}
                      <span className="text-muted-foreground"> · {fmtDate(e.date)}</span>
                    </span>
                    <span className="tabular-nums font-semibold">₹{e.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonDetail;
