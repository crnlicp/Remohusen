import type { DocumentBrand } from "./api";

export const LETTERHEAD_FIT_ERROR = "Company details, header and footer are too long to fit on a PDF page. Shorten the highlighted field in Document settings.";

const multiline = (value: string) => value.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").trim();
const singleLine = (value: string) => value.replace(/\s+/g, " ").trim();
const local = (value: { sv: string; en: string }, en: boolean) => en && value.en ? value.en : value.sv;

function estimatedLines(value: string, capacity: number) {
  if (!value) return 0;
  return value.split("\n").reduce((total, paragraph) => {
    let lines = 1, used = 0;
    for (const word of paragraph.split(" ")) {
      for (const part of word.match(/.{1,20}/gu) ?? []) {
        const length = part.length + (used ? 1 : 0);
        if (used && used + length > capacity) { lines++; used = part.length; }
        else used += length;
      }
    }
    return total + lines;
  }, 0);
}

export function documentLetterhead(brand: DocumentBrand, en: boolean) {
  const company = multiline(brand.legalName);
  const tagline = multiline(local(brand.header, en));
  const address = singleLine(brand.address.replace(/\s*\n\s*/g, ", "));
  const contact = multiline(brand.contact);
  const registration = [
    brand.orgNumber && `${en ? "Org. no." : "Org.nr"} ${singleLine(brand.orgNumber)}`,
    brand.vatNumber && `VAT ${singleLine(brand.vatNumber)}`,
    brand.fTax && (en ? "Approved for F-tax" : "Godkänd för F-skatt"),
  ].filter(Boolean).join(" | ");
  const footerNote = multiline(local(brand.footer, en));
  const companyHeaderLines = estimatedLines(company, 22);
  const companyFooterLines = estimatedLines(company, 26);
  const taglineLines = estimatedLines(tagline, 38);
  const addressLines = estimatedLines(address, 27);
  const contactLines = estimatedLines(contact, 27);
  const footerLines = estimatedLines(footerNote, 27);

  // Fixed letterhead must leave room for wrapped company details on every page.
  const headerHeight = Math.max(54, companyHeaderLines * 20 + (tagline ? 4 + taglineLines * 12 : 0));
  const leftLines = companyFooterLines + addressLines + contactLines;
  const rightLines = estimatedLines(registration, 27) + footerLines + 1;
  const paddingTop = 30 + headerHeight + 13 + 2 + 20;
  const paddingBottom = 26 + 2 + 8 + Math.max(leftLines, rightLines) * 11 + 12 + 20;
  const fields: [string, number][] = [
    ["brand.legalName", companyHeaderLines * 20 + companyFooterLines * 11],
    [`brand.header.${en && brand.header.en ? "en" : "sv"}`, taglineLines * 12],
    ["brand.address", addressLines * 11],
    ["brand.contact", contactLines * 11],
    [`brand.footer.${en && brand.footer.en ? "en" : "sv"}`, footerLines * 11],
  ];
  const largestField = fields.reduce((largest, field) => field[1] > largest[1] ? field : largest)[0];
  return {
    company, tagline, address, contact, registration, footerNote, paddingTop, paddingBottom,
    fits: paddingTop + paddingBottom <= 680, largestField,
  };
}
