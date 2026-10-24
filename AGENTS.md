# Architecture rules
- Expense chat interpretation runs only in the authenticated `ai-insights` edge function using the existing provider (no request limit); credentials must never reach the browser.
- Expense chat validates structured model output using the pure expense-parser module, then records through `useLifeData.addExpense`/`addLoan` so manual and chat entries share local persistence and sync.
- Chat uses the globally selected date at submission, not model-generated dates, to preserve dashboard date filtering.- Loans live in their own `loans` table/store, never in `expenses`, so lending never inflates spending totals.
- Expense categories are dynamic: the list is starter defaults merged with categories already used (`mergeCategories`); never validate against a fixed list.
