import { describe, expect, it } from "vitest";
import { calculateTotals, decimal, lineAmounts, money, retentionDate, scaled } from "../src/lib/documents";
import { input } from "./fixtures";

describe("exact SEK calculations", () => {
  it("rounds fractional quantity and discount once at the net line boundary", () => {
    expect(lineAmounts(input.lines[0])).toEqual({ net: 13501n, vat: 3375n });
    expect(calculateTotals(input)).toEqual({ netOre: 13501n, vatOre: 3375n, grossOre: 16876n, payableOre: 16876n });
  });
  it("supports mixed VAT and reverse-charge lines without floating point", () => {
    const line = input.lines[0];
    expect(calculateTotals({ ...input, lines: [{ ...line, quantityMilli: 1000n, discountBps: 0n, unitOre: 10000n, vatBps: 600n }, { ...line, quantityMilli: 1000n, discountBps: 0n, unitOre: 10000n, treatment: "reverse", vatBps: 0n }] }))
      .toEqual({ netOre: 20000n, vatOre: 600n, grossOre: 20600n, payableOre: 20600n });
  });
  it("deducts ROT without reducing VAT", () => {
    expect(calculateTotals({ ...input, rotOre: 3000n }).vatOre).toBe(3375n);
    expect(calculateTotals({ ...input, rotOre: 3000n }).payableOre).toBe(13876n);
    expect(() => calculateTotals({ ...input, rotOre: 999999n })).toThrow("ROT");
  });
  it.each(["-1", "1e2", "NaN", "1.234", "", "1 000", "Infinity"])("rejects malformed amounts: %s", (value) => expect(() => scaled(value)).toThrow());
  it("parses Swedish amounts and formats exact ore", () => {
    expect(scaled("123,45")).toBe(12345n); expect(scaled("1.234", 3)).toBe(1234n);
    expect(decimal(1n)).toBe("0.01"); expect(money(-12345n, "en")).toBe("-123.45 SEK");
    expect(retentionDate("2026-06-30")).toBe("2033-12-31");
  });
});
