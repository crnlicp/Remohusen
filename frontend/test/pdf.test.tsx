import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { documentFixture } from "./fixtures";
import { lineAmounts } from "../src/lib/documents";
import { LETTERHEAD_FIT_ERROR } from "../src/lib/documentLetterhead";

vi.mock("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?inline", () => ({ default: `${process.cwd()}/node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff` }));
vi.mock("@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?inline", () => ({ default: `${process.cwd()}/node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff` }));

it("renders branded multi-page PDFs with Swedish glyphs, repeated letterhead and no private notes", async () => {
  const { renderDocumentPdf } = await import("../src/admin/documents/Pdf");
  const lines = Array.from({ length: 60 }, (_, i) => ({ ...documentFixture.input.lines[0], description: `Rad-${i} Ångström, kök, vägg och fönster. ${"Long description ".repeat(5)}` }));
  const netOre = lines.reduce((sum, line) => sum + lineAmounts(line).net, 0n);
  const vatOre = lines.reduce((sum, line) => sum + lineAmounts(line).vat, 0n);
  const blob = await renderDocumentPdf({ ...documentFixture, input: { ...documentFixture.input, lines }, totals: { netOre, vatOre, grossOre: netOre + vatOre, payableOre: netOre + vatOre } });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const pdf = await task.promise;
  expect(pdf.numPages).toBeGreaterThan(2);
  let all = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => "str" in item);
    const text = items.map((item) => item.str).join(" ");
    expect(text).toContain("Tack för förtroendet");
    expect(text).toContain(`Sida ${i} / ${pdf.numPages}`);
    expect(text).toContain("Org.nr 556000-0000");
    expect(text).toContain("VAT SE556000000001");
    expect(text).toContain("Godkänd för F-skatt");
    const headerBottom = Math.min(...items.filter((item) => item.str.includes("Bygg och renovering")).map((item) => item.transform[5]));
    const footerTop = Math.max(...items.filter((item) => item.transform[5] < 200 && item.str.includes("Org.nr")).map((item) => item.transform[5]));
    for (const item of items.filter((item) => item.str.startsWith("Rad-"))) {
      expect(item.transform[5]).toBeGreaterThan(footerTop + 15);
      expect(item.transform[5]).toBeLessThan(headerBottom - 15);
    }
    const operators = await page.getOperatorList();
    const logos = operators.argsArray.filter((_, index) => operators.fnArray[index] === OPS.paintImageXObject);
    expect(logos).toHaveLength(1);
    expect(logos[0].slice(1)).toEqual([192, 192]);
    const colours = operators.argsArray.filter((_, index) => operators.fnArray[index] === OPS.setFillRGBColor).map((args) => args[0]);
    expect(colours).toContain("#0b1220");
    expect(colours).toContain("#fbbf24");
    expect(colours).toContain("#f97316");
    all += ` ${text}`;
  }
  expect(all).toContain("Ångström"); expect(all).toContain("Rad-59"); expect(all).toContain("Att betala");
  expect(all).not.toContain("PRIVATE-NOTES"); expect(all).not.toContain("DRAFT");
  for (let i = 0; i < lines.length; i++) expect(all.match(new RegExp(`Rad-${i}(?=\\s|$)`, "g"))).toHaveLength(1);
  expect(all.match(/100,01 SEK/g)).toHaveLength(lines.length);
  await task.destroy();
});

it("uses the custom logo and English letterhead for letters and accounting preparation", async () => {
  const { renderDocumentPdf, renderPreparationPdf } = await import("../src/admin/documents/Pdf");
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const customLogo = `data:image/png;base64,${(await readFile("public/apple-touch-icon.png")).toString("base64")}`;
  const brand = { ...documentFixture.brand, logoData: customLogo };
  const letter = { ...documentFixture, brand, issuedAt: undefined, number: "", input: {
    ...documentFixture.input, kind: "letter", language: "en", title: "Company letter",
    lines: [], notes: "A customer-visible letter.", supplyDate: "", dueDate: "",
  } };
  const pdfs = [
    { blob: await renderDocumentPdf(letter), expected: ["DRAFT - not issued", "RECIPIENT", "A customer-visible letter."] },
    { blob: await renderPreparationPdf(brand, "Accounting preparation", "Synthetic preparation content", "en"), expected: ["PREPARATION ONLY - NOT FILED", "Synthetic preparation content"] },
  ];
  for (const { blob, expected } of pdfs) {
    const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true });
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items.filter((item) => "str" in item).map((item) => item.str).join(" ");
    for (const value of [...expected, "Construction", "Thank you", "Org. no. 556000-0000", "Page 1 / 1"]) expect(text).toContain(value);
    expect(text).not.toContain("PRIVATE-NOTES");
    const operators = await page.getOperatorList();
    const logos = operators.argsArray.filter((_, index) => operators.fnArray[index] === OPS.paintImageXObject);
    expect(logos).toHaveLength(1);
    expect(logos[0].slice(1)).toEqual([180, 180]);
    await task.destroy();
  }
});

it("preserves configured line breaks and explicitly rejects a letterhead that cannot fit", async () => {
  const { renderDocumentPdf, renderPreparationPdf } = await import("../src/admin/documents/Pdf");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const brand = { ...documentFixture.brand, header: { sv: "Bygg och renovering\nStockholm", en: "" }, footer: { sv: "Tack för förtroendet\nVälkommen åter", en: "" } };
  const blob = await renderDocumentPdf({ ...documentFixture, brand });
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true });
  const page = await (await task.promise).getPage(1);
  const items = (await page.getTextContent()).items.filter((item) => "str" in item);
  const position = (value: string) => items.find((item) => item.str.includes(value))!.transform[5];
  expect(position("Bygg och renovering")).toBeGreaterThan(position("Stockholm"));
  expect(position("Tack för förtroendet")).toBeGreaterThan(position("Välkommen åter"));
  await task.destroy();

  const excessive = { ...brand, header: { sv: "X\n".repeat(75), en: "" } };
  await expect(renderDocumentPdf({ ...documentFixture, brand: excessive })).rejects.toThrow(LETTERHEAD_FIT_ERROR);
  await expect(renderPreparationPdf(excessive, "Preparation", "Synthetic", "sv")).rejects.toThrow(LETTERHEAD_FIT_ERROR);
});

it("repeats the letterhead throughout multi-page accounting preparation", async () => {
  const { renderPreparationPdf } = await import("../src/admin/documents/Pdf");
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const content = Array.from({ length: 140 }, (_, i) => `Preparation line ${i} Åäö`).join("\n");
  const blob = await renderPreparationPdf(documentFixture.brand, "VAT preparation", content, "en");
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true });
  const pdf = await task.promise;
  expect(pdf.numPages).toBeGreaterThan(1);
  let all = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = (await page.getTextContent()).items.filter((item) => "str" in item).map((item) => item.str).join(" ");
    expect(text).toContain("Construction");
    expect(text).toContain("Thank you");
    expect(text).toContain(`Page ${i} / ${pdf.numPages}`);
    const operators = await page.getOperatorList();
    expect(operators.fnArray.filter((op) => op === OPS.paintImageXObject)).toHaveLength(1);
    all += ` ${text}`;
  }
  expect(all).toContain("Preparation line 0 Åäö");
  expect(all).toContain("Preparation line 139 Åäö");
  await task.destroy();
});

it("keeps long company details and oversized line items inside the repeating letterhead", async () => {
  const { renderDocumentPdf } = await import("../src/admin/documents/Pdf");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const brand = {
    ...documentFixture.brand,
    legalName: `COMPANY_START ${"W ".repeat(48)}COMPANY_END`,
    address: `ADDRESS_START ${"W ".repeat(100)}ADDRESS_END`,
    contact: `CONTACT_START ${"W ".repeat(80)}CONTACT_END`,
    header: { sv: `HEADER_START ${"W ".repeat(82)}HEADER_END`, en: "" },
    footer: { sv: `FOOTER_START ${"W ".repeat(130)}FOOTER_END`, en: "" },
  };
  const doc = { ...documentFixture, brand, input: {
    ...documentFixture.input, customerAddress: `BUYER_START ${"W ".repeat(210)}BUYER_END`,
    lines: [{ ...documentFixture.input.lines[0], description: `LINE_START ${"W ".repeat(460)}LINE_END` }],
  } };
  const task = getDocument({ data: new Uint8Array(await (await renderDocumentPdf(doc)).arrayBuffer()), useSystemFonts: true });
  const pdf = await task.promise;
  expect(pdf.numPages).toBeGreaterThan(1);
  let all = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const items = (await page.getTextContent()).items.filter((item) => "str" in item);
    const text = items.map((item) => item.str).join(" ");
    for (const value of ["HEADER_START", "HEADER_END", "FOOTER_START", "FOOTER_END", "COMPANY_START", "COMPANY_END",
      "ADDRESS_START", "ADDRESS_END", "CONTACT_START", "CONTACT_END", `Sida ${i} / ${pdf.numPages}`]) expect(text).toContain(value);
    const headerBottom = items.find((item) => item.str.includes("HEADER_END"))!.transform[5];
    const footerTop = Math.max(...items.filter((item) => item.transform[5] < 300 && (item.str.includes("COMPANY_START") || item.str.includes("Org.nr"))).map((item) => item.transform[5]));
    for (const item of items.filter((item) => /LINE_START|LINE_END|BUYER_START|BUYER_END/.test(item.str))) {
      expect(item.transform[5]).toBeGreaterThan(footerTop + 15);
      expect(item.transform[5]).toBeLessThan(headerBottom - 15);
    }
    all += ` ${text}`;
  }
  expect(all).toContain("LINE_START");
  expect(all).toContain("LINE_END");
  expect(all).toContain("BUYER_START");
  expect(all).toContain("BUYER_END");
  expect(all).toContain("100,01 SEK");
  expect(all).toContain("Att betala");
  await task.destroy();
});
