import type { BusinessDocument, DocumentInput, DocumentSettings } from "../src/bindings/backend";
import { newInput } from "../src/lib/documents";

export const settings: DocumentSettings = {
  brand: { legalName: "Test Åäö Kommanditbolag", orgNumber: "556000-0000", address: "Testgatan 1, 12345 Stockholm", contact: "example@example.invalid",
    vatNumber: "SE556000000001", fTax: true, paymentDetails: "Bankgiro TEST", header: { sv: "Bygg och renovering", en: "Construction" },
    footer: { sv: "Tack för förtroendet", en: "Thank you" }, logoData: "" },
  invoicePrefix: "TEST-", paymentDays: 30n, financialYearEnd: "2026-12-31", vatRegistered: "yes", employees: "unknown",
  partnerType: "individuals", accountingMethod: "invoice", vatPeriod: "quarter", archiveService: "Synthetic test archive", privacyApproved: true,
};
export const input: DocumentInput = {
  ...newInput(settings), title: "Faktura Åäö", issueDate: "2026-10-30", dueDate: "2026-11-30", supplyDate: "2026-10-30",
  customerName: "Synthetic customer", customerAddress: "Testvägen 2, Stockholm", internalNotes: "PRIVATE-NOTES-DO-NOT-SHARE",
  lines: [{ description: "Renovering Åäö", quantityMilli: 1500n, unitOre: 10001n, discountBps: 1000n, vatBps: 2500n, category: "labour", treatment: "standard", exemptionReason: "" }],
};
export const documentFixture: BusinessDocument = {
  id: 1n, revision: 1n, input, brand: settings.brand, number: "TEST-1", sourceNumber: "", issuedAt: 1n, createdAt: 1n,
  totals: { netOre: 13501n, vatOre: 3375n, grossOre: 16876n, payableOre: 16876n }, pdfReady: false, pdfHash: "", pdfChunks: 0n,
  payments: [], evidence: { archiveReference: "", einvoiceReference: "", acceptanceReference: "" }, events: [],
};
