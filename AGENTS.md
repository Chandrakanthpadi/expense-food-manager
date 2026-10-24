# Architecture rules
- Expense chat interpretation runs only in the authenticated `ai-insights` edge function using the existing provider (no request limit); credentials must never reach the browser.
- Expense chat validates structured model output using the pure expense-parser module, then records through `useLifeData.addExpense` so manual and chat entries share local persistence and sync.
- Chat uses the globally selected date at submission, not model-generated dates, to preserve dashboard date filtering.