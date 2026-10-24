import { describe, expect, it } from "vitest";
import { expenseChatPrompt, mergeCategories, parseChatResult, parseExpenseResult } from "../../supabase/functions/ai-insights/expense-parser";
import { loanBalances } from "@/components/LoansTracker";

describe("expense chat extraction", () => {
  it("records 500 for chai as a Food expense", () => {
    expect(parseExpenseResult('{"amount":500,"category":"Food","note":"chai"}'))
      .toEqual({ type: "expense", amount: 500, category: "Food", note: "chai" });
    expect(expenseChatPrompt("500 for chai")).toContain("chai, tea, coffee");
  });
  it.each([0, -500, "500", null])("rejects invalid amount %s instead of saving", amount => {
    expect(() => parseChatResult(JSON.stringify({ type: "expense", amount, category: "Food", note: "chai" }))).toThrow();
  });
  it("accepts a new AI-created category and reuses existing ones case-insensitively", () => {
    expect(parseChatResult('{"amount":300,"category":"entertainment","note":"movie"}').type === "expense"
      && (parseChatResult('{"amount":300,"category":"entertainment","note":"movie"}') as any).category).toBe("Entertainment");
    expect((parseChatResult('{"amount":300,"category":"gifts","note":"x"}', ["Gifts"]) as any).category).toBe("Gifts");
  });
  it("records who an expense was spent on", () => {
    expect(parseChatResult('{"type":"expense","amount":800,"category":"Food","note":"dinner","person":"ravi"}'))
      .toEqual({ type: "expense", amount: 800, category: "Food", note: "dinner", person: "Ravi" });
  });
  it("parses lending and repayment", () => {
    expect(parseChatResult('{"type":"loan","amount":500,"kind":"lent","person":"Ravi","note":""}'))
      .toEqual({ type: "loan", amount: 500, kind: "lent", person: "Ravi", note: "" });
    expect(() => parseChatResult('{"type":"loan","amount":500,"kind":"gift","person":"Ravi"}')).toThrow();
    expect(() => parseChatResult('{"type":"loan","amount":500,"kind":"lent"}')).toThrow();
  });
  it("rejects missing purchases and model clarification responses", () => {
    expect(() => parseChatResult('{"error":"What did you buy?"}')).toThrow();
    expect(() => parseChatResult('{"amount":500,"category":"Food","note":""}')).toThrow();
  });
  it("merges used categories without duplicates", () => {
    expect(mergeCategories(["food", "Gifts", "Gifts"])).toEqual(["Food", "Groceries", "Transport", "Bills", "Shopping", "Health", "Other", "Gifts"]);
  });
});

describe("loan balances", () => {
  it("amount to get back = lent minus repaid per person", () => {
    const b = loanBalances([
      { id: "1", person: "Ravi", amount: 1000, kind: "lent", note: "", date: "2026-10-01" },
      { id: "2", person: "ravi", amount: 300, kind: "repaid", note: "", date: "2026-10-05" },
      { id: "3", person: "Anu", amount: 200, kind: "lent", note: "", date: "2026-10-05" },
    ]);
    expect(b.find(x => x.person === "Ravi")?.due).toBe(700);
    expect(b.find(x => x.person === "Anu")?.due).toBe(200);
  });
  it("borrowing reduces the net to get back; returning restores it", () => {
    const b = loanBalances([
      { id: "1", person: "Vamsi", amount: 500, kind: "lent", note: "", date: "2026-10-01" },
      { id: "2", person: "Vamsi", amount: 200, kind: "borrowed", note: "", date: "2026-10-02" },
    ]);
    expect(b.find(x => x.person === "Vamsi")?.due).toBe(300);
    const settled = loanBalances([
      { id: "1", person: "Vamsi", amount: 500, kind: "borrowed", note: "", date: "2026-10-01" },
      { id: "2", person: "Vamsi", amount: 500, kind: "returned", note: "", date: "2026-10-02" },
    ]);
    expect(settled.find(x => x.person === "Vamsi")?.due).toBe(0);
    const iOwe = loanBalances([
      { id: "1", person: "Vamsi", amount: 200, kind: "borrowed", note: "", date: "2026-10-01" },
    ]);
    expect(iOwe.find(x => x.person === "Vamsi")?.due).toBe(-200);
  });
  it("parses borrowing and returning from chat", () => {
    expect(parseChatResult('{"type":"loan","amount":200,"kind":"borrowed","person":"vamsi","note":""}'))
      .toEqual({ type: "loan", amount: 200, kind: "borrowed", person: "Vamsi", note: "" });
    expect(parseChatResult('{"type":"loan","amount":200,"kind":"returned","person":"Vamsi","note":""}'))
      .toEqual({ type: "loan", amount: 200, kind: "returned", person: "Vamsi", note: "" });
    expect(() => parseChatResult('{"type":"loan","amount":500,"kind":"gift","person":"Ravi"}')).toThrow();
  });
});
