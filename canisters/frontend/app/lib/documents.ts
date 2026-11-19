import type { BusinessDocument, DocumentInput, DocumentLine, DocumentSettings, Settings, ContactInfo } from "./api";

export const documentKinds = {
  quote: ["Offert", "Quotation"], order: ["Orderbekräftelse", "Order confirmation"],
  change: ["Ändringsorder / ÄTA", "Change order"], invoice: ["Faktura", "Invoice"],
  advance: ["Förskottsfaktura", "Advance invoice"], progress: ["Delfaktura", "Progress invoice"],
  final: ["Slutfaktura", "Final invoice"], rot: ["ROT-faktura", "ROT invoice"],
  credit: ["Kreditfaktura", "Credit invoice"], reminder: ["Betalningspåminnelse", "Payment reminder"],
  payment: ["Betalningsbekräftelse", "Payment confirmation"], handover: ["Överlämningsprotokoll", "Handover record"],
  letter: ["Företagsbrev", "Company letter"],
} as const;
export type DocumentKind = keyof typeof documentKinds;
export const isDocumentKind = (value: string): value is DocumentKind => Object.hasOwn(documentKinds, value);
export const kindLabel = (kind: string, language = "sv") => isDocumentKind(kind) ? documentKinds[kind][language === "en" ? 1 : 0] : kind;
export const isInvoice = (kind: string) => ["invoice", "advance", "progress", "final", "rot", "credit"].includes(kind);
export const today = () => new Date().toLocaleDateString("sv-SE");

export function scaled(value: string, decimals = 2): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(normalized)) throw new Error(`Enter a non-negative number with at most ${decimals} decimals`);
  const [whole, fraction = ""] = normalized.split(".");
  const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
  if (result > 100_000_000_000_000n) throw new Error("Number exceeds the supported limit");
  return result;
}

export function decimal(value: bigint, decimals = 2): string {
  const base = 10n ** BigInt(decimals);
  return `${value / base}.${(value % base).toString().padStart(decimals, "0")}`;
}
export function money(value: bigint, language = "sv"): string {
  const negative = value < 0n;
  const amount = negative ? -value : value;
  return `${negative ? "-" : ""}${new Intl.NumberFormat(language === "en" ? "en-GB" : "sv-SE").format(amount / 100n)}${language === "en" ? "." : ","}${(amount % 100n).toString().padStart(2, "0")} SEK`;
}
export function lineAmounts(line: DocumentLine) {
  if (line.discountBps > 10000n || line.quantityMilli <= 0n || line.unitOre < 0n) throw new Error("Invalid line values");
  const net = (line.quantityMilli * line.unitOre * (10000n - line.discountBps) + 5_000_000n) / 10_000_000n;
  const vat = line.treatment === "standard" ? (net * line.vatBps + 5000n) / 10000n : 0n;
  return { net, vat };
}
export function calculateTotals(input: DocumentInput) {
  let netOre = 0n, vatOre = 0n;
  for (const line of input.lines) {
    const amounts = lineAmounts(line);
    netOre += amounts.net;
    vatOre += amounts.vat;
  }
  const grossOre = netOre + vatOre;
  if (input.rotOre > grossOre) throw new Error("ROT cannot exceed the invoice total");
  return { netOre, vatOre, grossOre, payableOre: grossOre - input.rotOre };
}
export function newLine(): DocumentLine {
  return { description: "", quantityMilli: 1000n, unitOre: 0n, discountBps: 0n, vatBps: 2500n, category: "labour", treatment: "standard", exemptionReason: "" };
}
export function newInput(settings: DocumentSettings, kind: DocumentKind = "invoice"): DocumentInput {
  const due = new Date();
  due.setDate(due.getDate() + Number(settings.paymentDays));
  return {
    kind, language: "sv", title: kindLabel(kind), customerName: "", customerAddress: "", customerVat: "",
    customerType: "private", project: "", issueDate: today(), supplyDate: today(), dueDate: due.toLocaleDateString("sv-SE"),
    terms: "", notes: "", internalNotes: "", lines: [newLine()], reverseChargeConfirmed: false, rotOre: 0n, rotConfirmed: false,
  };
}
export function defaultDocumentSettings(settings: Settings, contact: ContactInfo): DocumentSettings {
  return {
    brand: { legalName: settings.companyName, orgNumber: settings.orgNumber, address: `${contact.address}\n${contact.postalCode} ${contact.city}`,
      contact: `${contact.email} | ${contact.phone}`, vatNumber: "", fTax: false, paymentDetails: "",
      header: settings.tagline, footer: settings.footerText, logoData: "" },
    invoicePrefix: "RH-", paymentDays: 30n, financialYearEnd: `${new Date().getFullYear()}-12-31`,
    vatRegistered: "unknown", employees: "unknown", partnerType: "unknown", accountingMethod: "unknown",
    vatPeriod: "unknown", archiveService: "", privacyApproved: false,
  };
}
export function sampleDocument(settings: DocumentSettings, language: "sv" | "en"): BusinessDocument {
  const en = language === "en";
  const input = {
    ...newInput(settings), language, title: en ? "SAMPLE – Invoice" : "EXEMPEL – Faktura",
    customerName: en ? "Example customer (fictional)" : "Exempelkund (fiktiv)",
    customerAddress: "Exempelgatan 1\n123 45 Exempelstad", project: en ? "Example renovation project" : "Exempel på renoveringsprojekt",
    lines: [{ ...newLine(), description: en ? "Example renovation work" : "Exempel på renoveringsarbete", quantityMilli: 2000n, unitOre: 100_000n }],
    terms: en ? "Sample payment terms: 30 days." : "Exempelvillkor: 30 dagars betalning.",
    notes: en ? "SAMPLE ONLY. Not an issued invoice. No customer data is saved." : "ENDAST EXEMPEL. Inte en utfärdad faktura. Inga kunduppgifter sparas.",
  };
  return {
    id: 0n, revision: 0n, input, brand: { ...settings.brand,
      legalName: settings.brand.legalName || "Exempelföretag KB", orgNumber: settings.brand.orgNumber || "EXEMPEL",
      address: settings.brand.address || "Exempelvägen 2, Exempelstad",
      header: { sv: settings.brand.header.sv || "Exempel på företagets sidhuvud", en: settings.brand.header.en || "Example company header" },
      footer: { sv: settings.brand.footer.sv || "Exempel på företagets sidfot", en: settings.brand.footer.en || "Example company footer" },
      paymentDetails: settings.brand.paymentDetails || (en ? "Sample bank details – do not pay" : "Exempel på betalningsuppgifter – betala inte"),
    }, totals: calculateTotals(input), number: "", sourceNumber: "", createdAt: 0n,
    pdfReady: false, pdfHash: "", pdfChunks: 0n, payments: [],
    evidence: { archiveReference: "", einvoiceReference: "", acceptanceReference: "" }, events: [],
  };
}
export function paidOre(doc: BusinessDocument) { return doc.payments.reduce((sum, p) => sum + p.amountOre, 0n); }
export function retentionDate(financialYearEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(financialYearEnd)) throw new Error("Set the financial year end first");
  return `${Number(financialYearEnd.slice(0, 4)) + 7}-12-31`;
}
export const serialise = (value: unknown) => JSON.stringify(value, (_, v: unknown) => typeof v === "bigint" ? v.toString() : v, 2);
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
