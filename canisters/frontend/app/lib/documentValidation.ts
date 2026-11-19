import type { DocumentInput, DocumentSettings } from "./api";
import { calculateTotals, isInvoice, lineAmounts } from "./documents";
import { documentLetterhead, LETTERHEAD_FIT_ERROR } from "./documentLetterhead";

export type FieldErrors = Record<string, string>;
export function validDocumentDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-01" && value <= "2100-12-31" &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateDocumentSettings(settings: DocumentSettings, issuing = false): FieldErrors {
  const errors: FieldErrors = {};
  for (const [name, value, max, required] of [
    ["brand.legalName", settings.brand.legalName, 120, true],
    ["brand.orgNumber", settings.brand.orgNumber, 30, true],
    ["brand.address", settings.brand.address, 250, true],
    ["brand.contact", settings.brand.contact, 200, false],
    ["brand.vatNumber", settings.brand.vatNumber, 30, issuing && settings.vatRegistered === "yes"],
    ["brand.paymentDetails", settings.brand.paymentDetails, 1000, issuing],
    ["brand.header.sv", settings.brand.header.sv, 200, false],
    ["brand.header.en", settings.brand.header.en, 200, false],
    ["brand.footer.sv", settings.brand.footer.sv, 300, false],
    ["brand.footer.en", settings.brand.footer.en, 300, false],
    ["invoicePrefix", settings.invoicePrefix, 20, true],
    ["archiveService", settings.archiveService, 300, true],
  ] as const) {
    if (required && !value.trim()) errors[name] = "This field is required.";
    else if ([...value].length > max) errors[name] = "The value is too long.";
  }
  if (!/^[\p{L}\p{N}-]+$/u.test(settings.invoicePrefix)) errors.invoicePrefix = "Use letters, numbers or hyphens only.";
  if (settings.paymentDays < 0n || settings.paymentDays > 365n) errors.paymentDays = "Enter between 0 and 365 days.";
  if (!validDocumentDate(settings.financialYearEnd)) errors.financialYearEnd = "Enter a valid date.";
  for (const en of [false, true]) {
    const layout = documentLetterhead(settings.brand, en);
    if (!layout.fits && !errors[layout.largestField]) errors[layout.largestField] = LETTERHEAD_FIT_ERROR;
  }
  if (issuing && settings.vatRegistered === "unknown") errors.vatRegistered = "Confirm the VAT registration status.";
  if (issuing && !settings.privacyApproved) errors.privacyApproved = "Confirm the privacy and archive arrangements.";
  return errors;
}
export function validateDocument(input: DocumentInput, settings: DocumentSettings, issuing = false): FieldErrors {
  const errors: FieldErrors = {};
  const required = (field: string, value: string) => { if (!value.trim()) errors[field] = "This field is required."; };
  required("title", input.title);
  required("customerName", input.customerName);
  if (!validDocumentDate(input.issueDate)) errors.issueDate = "Enter a valid date.";
  if (input.supplyDate && !validDocumentDate(input.supplyDate)) errors.supplyDate = "Enter a valid date.";
  if (input.dueDate && (!validDocumentDate(input.dueDate) || input.dueDate < input.issueDate)) errors.dueDate = "The date must be on or after the issue date.";
  if (issuing && isInvoice(input.kind)) {
    required("customerAddress", input.customerAddress);
    if (!input.supplyDate) errors.supplyDate = "This field is required.";
    if (!input.dueDate) errors.dueDate = "This field is required.";
    if (!input.lines.length) errors.lines = "Add at least one line item.";
  }
  if (["credit", "reminder", "payment", "change"].includes(input.kind) && !input.sourceId && issuing) errors.sourceId = "Select the original document ID.";
  if (input.sourceId !== undefined && input.sourceId <= 0n) errors.sourceId = "Select the original document ID.";
  if (input.lines.length > 100) errors.lines = "At most 100 lines are supported.";
  let labourGross = 0n;
  for (const [index, line] of input.lines.entries()) {
    const key = `lines.${index}.`;
    required(key + "description", line.description);
    if (line.quantityMilli <= 0n || line.quantityMilli > 1_000_000_000n) errors[key + "quantityMilli"] = "Quantity must be greater than zero and at most 1,000,000.";
    if (line.unitOre < 0n || line.unitOre > 100_000_000_000n) errors[key + "unitOre"] = "Enter a price between 0 and 1,000,000,000 SEK.";
    if (line.discountBps < 0n || line.discountBps > 10_000n) errors[key + "discountBps"] = "Discount must be between 0 and 100 percent.";
    if (line.treatment === "exempt") required(key + "exemptionReason", line.exemptionReason);
    if (line.treatment === "reverse") {
      required("customerVat", input.customerVat);
      if (input.customerType === "private") errors.customerType = "Reverse charge requires a business buyer.";
      if (!input.reverseChargeConfirmed) errors.reverseChargeConfirmed = "Confirm reverse-charge eligibility.";
    }
    if (issuing && isInvoice(input.kind) && settings.vatRegistered === "no" && line.treatment !== "exempt") errors[key + "treatment"] = "A non-VAT-registered seller must use reviewed exempt lines.";
    if (!errors[key + "quantityMilli"] && !errors[key + "unitOre"] && !errors[key + "discountBps"] && line.category === "labour") {
      const amounts = lineAmounts(line);
      labourGross += amounts.net + amounts.vat;
    }
  }
  if (input.rotOre > 0n) {
    if (input.kind !== "rot" || input.customerType !== "private" || !settings.brand.fTax) errors.rotOre = "ROT requires a private customer and verified company F-tax approval.";
    else if (!input.issueDate.startsWith("2026-")) errors.issueDate = "ROT currently supports reviewed 2026 work only.";
    else if (input.rotOre > labourGross * 30n / 100n || input.rotOre > 5_000_000n) errors.rotOre = "ROT exceeds 30 percent of labour or SEK 50,000.";
    if (!input.rotConfirmed) errors.rotConfirmed = "Confirm ROT eligibility.";
    for (const [index, line] of input.lines.entries()) {
      if (line.treatment !== "standard" || line.vatBps !== 2500n) errors[`lines.${index}.treatment`] = "ROT requires standard 25 percent VAT.";
    }
  }
  if (!Object.keys(errors).length && calculateTotals(input).grossOre > 100_000_000_000_000n) errors.lines = "The document total exceeds the supported limit.";
  return errors;
}

export function focusInvalidField(root: HTMLElement, errors: FieldErrors) {
  const controls = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select, [data-error-focus]")];
  const control = controls.find((element) => !element.disabled && (!!errors[element.name] || element.getAttribute("aria-invalid") === "true" || !element.validity.valid));
  if (!control) return false;
  control.scrollIntoView({ block: "center", behavior: "smooth" });
  control.focus({ preventScroll: true });
  return true;
}
