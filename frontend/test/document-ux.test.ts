import { describe, expect, it } from "vitest";
import { translateAdmin } from "../src/admin/language";
import { sampleDocument } from "../src/lib/documents";
import { validDocumentDate, validateDocument, validateDocumentSettings } from "../src/lib/documentValidation";
import { LETTERHEAD_FIT_ERROR } from "../src/lib/documentLetterhead";
import { input, settings } from "./fixtures";

describe("document form feedback", () => {
  it("identifies each missing draft field instead of relying on a global toast", () => {
    const errors = validateDocument({ ...input, title: "", customerName: " ", lines: [{ ...input.lines[0], description: "" }] }, settings);
    expect(Object.keys(errors)).toEqual(["title", "customerName", "lines.0.description"]);
  });
  it("requires invoice fields only when issuing", () => {
    const draft = { ...input, customerAddress: "", supplyDate: "", dueDate: "" };
    expect(validateDocument(draft, settings)).toEqual({});
    expect(Object.keys(validateDocument(draft, settings, true))).toEqual(["customerAddress", "supplyDate", "dueDate"]);
  });
  it("returns field paths for invalid prices, quantities and discounts", () => {
    const errors = validateDocument({ ...input, lines: [{ ...input.lines[0], quantityMilli: 0n, unitOre: 100_000_000_001n, discountBps: 10001n }] }, settings);
    expect(Object.keys(errors)).toEqual(["lines.0.quantityMilli", "lines.0.unitOre", "lines.0.discountBps"]);
  });
  it("validates calendar dates and due date ordering", () => {
    expect(validDocumentDate("2026-02-29")).toBe(false);
    expect(validDocumentDate("2028-02-29")).toBe(true);
    expect(validDocumentDate("2100-02-29")).toBe(false);
    expect(validDocumentDate("2026-13-01")).toBe(false);
    expect(validateDocument({ ...input, dueDate: "2020-01-01" }, settings)).toHaveProperty("dueDate");
  });
  it("points reverse-charge errors at buyer VAT and eligibility", () => {
    const errors = validateDocument({ ...input, customerType: "private", customerVat: "", reverseChargeConfirmed: false, lines: [{ ...input.lines[0], treatment: "reverse", vatBps: 0n }] }, settings);
    expect(errors).toHaveProperty("customerVat");
    expect(errors).toHaveProperty("customerType");
    expect(errors).toHaveProperty("reverseChargeConfirmed");
  });
  it("requires a source document for linked issued documents", () => {
    expect(validateDocument({ ...input, kind: "credit", sourceId: undefined }, settings, true)).toHaveProperty("sourceId");
  });
  it("points settings failures at the actual company fields", () => {
    const errors = validateDocumentSettings({ ...settings, brand: { ...settings.brand, legalName: "", header: { sv: "x".repeat(201), en: "" } }, financialYearEnd: "" });
    expect(errors).toHaveProperty("brand.legalName");
    expect(errors).toHaveProperty("brand.header.sv");
    expect(errors).toHaveProperty("financialYearEnd");
  });
  it("requires registration and payment settings before issuing", () => {
    const errors = validateDocumentSettings({ ...settings, vatRegistered: "unknown", brand: { ...settings.brand, paymentDetails: "" }, privacyApproved: false }, true);
    expect(errors).toHaveProperty("vatRegistered");
    expect(errors).toHaveProperty("brand.paymentDetails");
    expect(errors).toHaveProperty("privacyApproved");
  });
  it("highlights letterhead content that cannot fit before a document is issued", () => {
    const header = { ...settings, brand: { ...settings.brand, header: { sv: "X\n".repeat(75), en: "" } } };
    expect(validateDocumentSettings(header)).toHaveProperty("brand.header.sv", LETTERHEAD_FIT_ERROR);
    const footer = { ...settings, brand: { ...settings.brand, footer: { sv: "Tack", en: "Y\n".repeat(140) } } };
    expect(validateDocumentSettings(footer)).toHaveProperty("brand.footer.en", LETTERHEAD_FIT_ERROR);
    expect(translateAdmin("sv", LETTERHEAD_FIT_ERROR)).toContain("dokumentinställningarna");
  });
});
describe("Admin language and safe sample preview", () => {
  it("translates the Admin without translating customer document values", () => {
    expect(translateAdmin("sv", "Saved documents")).toBe("Sparade dokument");
    expect(translateAdmin("en", "Saved documents")).toBe("Saved documents");
    expect(translateAdmin("sv", "Line {index} — description / scope", { index: 2 })).toBe("Rad 2 – beskrivning / omfattning");
    expect(translateAdmin("sv", "Welcome back, {0}", { "0": undefined })).toBe("Välkommen tillbaka, ");
    expect(translateAdmin("sv", "Company name supplied by user")).toBe("Company name supplied by user");
  });
  it("builds a clearly fictional unsaved sample without changing real settings", () => {
    const before = structuredClone(settings);
    const sample = sampleDocument(settings, "sv");
    expect(settings).toEqual(before);
    expect(sample.id).toBe(0n);
    expect(sample.issuedAt).toBeUndefined();
    expect(sample.input.title).toContain("EXEMPEL");
    expect(sample.input.notes).toContain("Inga kunduppgifter sparas");
    expect(sample.input.customerName).toContain("fiktiv");
    expect(sample.pdfReady).toBe(false);
    expect(sample.totals.grossOre).toBe(250_000n);
    expect(sampleDocument(settings, "en").input.title).toContain("SAMPLE");
  });
});
