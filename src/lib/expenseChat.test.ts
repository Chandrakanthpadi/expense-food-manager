import { describe, expect, it } from "vitest";
import { expenseChatPrompt, parseExpenseResult } from "../../supabase/functions/ai-insights/expense-parser";

describe("expense chat extraction", () => {
  it("records 500 for chai as a Food expense", () => {
    expect(parseExpenseResult('{"amount":500,"category":"Food","note":"chai"}'))
      .toEqual({ amount: 500, category: "Food", note: "chai" });
    expect(expenseChatPrompt("500 for chai")).toContain("Chai, tea, coffee, restaurant meals and prepared snacks are Food.");
  });
  it.each([0, -500, "500", null])("rejects invalid amount %s instead of saving", amount => {
    expect(() => parseExpenseResult(JSON.stringify({ amount, category: "Food", note: "chai" }))).toThrow();
  });
  it("rejects categories outside the expense list", () => {
    expect(() => parseExpenseResult('{"amount":500,"category":"Invented","note":"chai"}')).toThrow();
  });
  it("rejects missing purchases and model clarification responses", () => {
    expect(() => parseExpenseResult('{"error":"What did you buy?"}')).toThrow();
    expect(() => parseExpenseResult('{"amount":500,"category":"Food","note":""}')).toThrow();
  });
});