import { describe, expect, it } from "vitest";
import { importAccounting, parseCsv, preparationText, sampleCsv } from "../src/lib/accountingPreparation";

const load = (text = sampleCsv) => importAccounting(text, "556000-0000", "2026-12-31");
describe("private accountant preparation", () => {
  it("validates a balanced dataset and approved signed mappings", () => {
    const data = load();
    expect(data.errors).toEqual([]); expect(data.fields.get("VAT:05")).toBe(100000n); expect(data.fields.get("VAT:10")).toBe(25000n);
    const text = preparationText(data, "VAT", "Reviewer reference", "Bank and source reconciled", "en");
    expect(text).toContain("NOT FILED"); expect(text).toContain("250.00 SEK");
  });
  it.each([
    ["wrong company", sampleCsv.replaceAll("556000-0000", "556111-1111")],
    ["wrong period", sampleCsv.replaceAll("2026-12-31", "2027-12-31")],
    ["unbalanced records", sampleCsv.replace("125000", "125001")],
    ["duplicate IDs", sampleCsv.replace("example-3", "example-2")],
    ["invalid calendar date", sampleCsv.replaceAll("2026-10-01", "2026-02-30")],
    ["unmapped records", sampleCsv.replace("VAT:10:-", "")],
    ["duplicate mapping", sampleCsv.replace("VAT:10:-", "VAT:10:-;VAT:10:-")],
  ])("blocks %s", (_, text) => {
    const data = load(text); expect(data.errors.length).toBeGreaterThan(0);
    expect(() => preparationText(data, "VAT", "Reviewer", "Reconciled", "en")).toThrow();
  });
  it("does not invent partner or payroll reporting from sales data", () => {
    expect(() => preparationText(load(), "N3A", "Reviewer", "Reviewed", "sv")).toThrow("No N3A fields");
    expect(() => preparationText(load(), "AGI", "Reviewer", "Reviewed", "sv")).toThrow();
    expect(() => preparationText(load(), "VAT", "", "Reviewed", "sv")).toThrow("Reviewer");
  });
  it("parses quoted commas, newlines and escaped quotes", () => {
    expect(parseCsv('a,b\r\n"one, two","a ""quote"""\r\n')).toEqual([["a", "b"], ["one, two", 'a "quote"']]);
    expect(() => parseCsv('"unclosed')).toThrow("Unclosed");
    expect(() => parseCsv('"a"x,b')).toThrow("Unexpected");
  });
});
