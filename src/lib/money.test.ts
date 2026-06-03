import { describe, it, expect } from "vitest";
import { parseAmountToMinor, formatMinor, decimalsFor } from "./money";

describe("money", () => {
  it("CLP has zero decimals", () => {
    expect(decimalsFor("CLP")).toBe(0);
    expect(parseAmountToMinor("12500", "CLP")).toBe(12500);
    expect(parseAmountToMinor("12500.4", "CLP")).toBe(12500);
    expect(parseAmountToMinor("12500.6", "CLP")).toBe(12501);
  });

  it("USD has two decimals", () => {
    expect(decimalsFor("USD")).toBe(2);
    expect(parseAmountToMinor("12.34", "USD")).toBe(1234);
    expect(parseAmountToMinor("12", "USD")).toBe(1200);
    expect(parseAmountToMinor("12.5", "USD")).toBe(1250);
  });

  it("rejects garbage", () => {
    expect(parseAmountToMinor("abc", "USD")).toBeNull();
    expect(parseAmountToMinor("12.34.56", "USD")).toBeNull();
  });

  it("formatMinor renders currency", () => {
    const s = formatMinor(12500, "CLP", "es-CL");
    // Symbol/format may vary by ICU version but must contain the digits.
    expect(s).toMatch(/12[.,]?500/);
  });
});
