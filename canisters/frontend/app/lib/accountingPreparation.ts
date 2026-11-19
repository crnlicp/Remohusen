import { money } from "./documents";

export const csvHeader = "company,period_start,period_end,record_id,date,account,debit_ore,credit_ore,report_fields,source_ref";
export const sampleCsv = `${csvHeader}
556000-0000,2026-01-01,2026-12-31,example-1,2026-10-01,1930,125000,0,NONE,example-bank-1
556000-0000,2026-01-01,2026-12-31,example-2,2026-10-01,3001,0,100000,VAT:05:-;INK4R:sales:-,example-invoice-1
556000-0000,2026-01-01,2026-12-31,example-3,2026-10-01,2611,0,25000,VAT:10:-,example-invoice-1
`;
export interface AccountingRow {
  id: string; date: string; account: string; debit: bigint; credit: bigint;
  fields: string[]; source: string;
}
export interface AccountingImport {
  company: string; start: string; end: string; rows: AccountingRow[];
  debit: bigint; credit: bigint; fields: Map<string, bigint>; errors: string[];
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function parseCsv(text: string): string[][] {
  if (text.length > 5_000_000) throw new Error("CSV exceeds 5 MB");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += c;
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell.trim()); cell = ""; closed = false;
      if (c !== ",") {
        if (c === "\r" && input[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (rows.length > 10001) throw new Error("At most 10,000 accounting rows are supported");
      }
    } else {
      if (closed && c.trim() !== "") throw new Error("Unexpected data after a quoted CSV field");
      if (c === '"') throw new Error("Unexpected quote in CSV field");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function importAccounting(text: string, company: string, yearEnd: string): AccountingImport {
  const data = parseCsv(text);
  if (data.shift()?.join(",") !== csvHeader) throw new Error(`CSV header must be: ${csvHeader}`);
  if (!data.length) throw new Error("CSV contains no accounting records");
  const first = data[0];
  const start = first[1], end = first[2];
  const result: AccountingImport = { company, start, end, rows: [], debit: 0n, credit: 0n, fields: new Map(), errors: [] };
  if (!validDate(start) || !validDate(end) || start > end || end > yearEnd) result.errors.push("Invalid reporting period or period extends beyond the selected financial year end.");
  const ids = new Set<string>();
  const normaliseOrg = (s: string) => s.replace(/[\s-]/g, "");
  for (const [index, columns] of data.entries()) {
    const fail = (message: string) => result.errors.push(`Row ${index + 2}: ${message}`);
    if (columns.length !== 10) { fail("expected 10 columns"); continue; }
    const [org, from, to, id, date, account, debit, credit, mappings, source] = columns;
    if (normaliseOrg(org) !== normaliseOrg(company)) fail("company does not match document settings");
    if (from !== start || to !== end) fail("mixed reporting periods");
    if (!id || ids.has(id)) fail("missing or duplicate record_id");
    ids.add(id);
    if (!validDate(date) || date < start || date > end) fail("date outside the reporting period");
    if (!/^\d{4}$/.test(account)) fail("account must be a four-digit BAS account");
    if (!/^\d{1,14}$/.test(debit) || !/^\d{1,14}$/.test(credit)) { fail("amounts must be non-negative integer ore"); continue; }
    const debitOre = BigInt(debit), creditOre = BigInt(credit);
    if (debitOre > 0n && creditOre > 0n) fail("split debit and credit into separate records");
    if (!source || source.length > 300) fail("archive/source reference is required (max 300 characters)");
    const fields = mappings.split(";");
    if (!mappings) fail("explicit report_fields mapping or NONE is required");
    const seen = new Set<string>();
    for (const field of fields) {
      if (field === "NONE") {
        if (fields.length !== 1) fail("NONE cannot be combined with report mappings");
        continue;
      }
      const match = /^(VAT|INK4R|INK4S|INK4DU|N3A|N3B|AGI):([A-Za-z0-9_.-]{1,60}):([+-])$/.exec(field);
      if (!match) { fail(`invalid mapping: ${field}`); continue; }
      const key = `${match[1]}:${match[2]}`;
      if (seen.has(key)) fail(`duplicate mapping ${key}`);
      seen.add(key);
      const amount = match[3] === "+" ? debitOre - creditOre : creditOre - debitOre;
      result.fields.set(key, (result.fields.get(key) ?? 0n) + amount);
    }
    result.debit += debitOre; result.credit += creditOre;
    result.rows.push({ id, date, account, debit: debitOre, credit: creditOre, fields, source });
  }
  if (result.debit !== result.credit) result.errors.push("Debit and credit totals do not balance.");
  if (result.fields.size === 0) result.errors.push("No report fields are mapped.");
  return result;
}
export function preparationText(data: AccountingImport, report: string, reviewer: string, notes: string, language: string) {
  if (data.errors.length) throw new Error("Resolve all import errors before exporting preparation");
  if (!reviewer.trim() || !notes.trim()) throw new Error("Reviewer and reconciliation/completeness notes are required");
  const en = language === "en";
  const fields = [...data.fields].filter(([key]) => key.startsWith(`${report}:`));
  if (report !== "YEAR-END" && fields.length === 0) throw new Error(`No ${report} fields are mapped; obtain accountant-approved source data`);
  const accounts = new Map<string, bigint>();
  for (const row of data.rows) accounts.set(row.account, (accounts.get(row.account) ?? 0n) + row.debit - row.credit);
  return [
    en ? "PREPARATION ONLY - NOT FILED. Accountant review is required." : "ENDAST UNDERLAG - EJ INLÄMNAD. Granskning av redovisningskonsult krävs.",
    `${en ? "Company" : "Organisation"}: ${data.company}`,
    `${en ? "Period" : "Period"}: ${data.start} - ${data.end}`,
    `KB-preparation-v1 | ${en ? "Reviewed mappings, not official form validation" : "Granskade mappningar, inte validering av officiell blankett"}`,
    `${en ? "Reviewer" : "Granskare"}: ${reviewer}`,
    `${en ? "Reconciliation, completeness and adjustments" : "Avstämning, fullständighet och justeringar"}: ${notes}`,
    `${en ? "Rows" : "Rader"}: ${data.rows.length} | ${en ? "Debit" : "Debet"} ${money(data.debit, language)} | ${en ? "Credit" : "Kredit"} ${money(data.credit, language)}`,
    "",
    ...(report === "YEAR-END" ? [...accounts].sort().map(([account, amount]) => `${account}: ${money(amount, language)}`) : fields.sort().map(([key, amount]) => `${key}: ${money(amount, language)}`)),
    "",
    en ? "Source references (full records remain in the accounting archive):" : "Källreferenser (fullständiga poster finns i bokföringsarkivet):",
    ...[...new Set(data.rows.map((r) => r.source))],
    "",
    en ? "Not a complete statutory return, annual report or payroll calculation. Opening balances, closing entries, disclosures, partner adjustments and source completeness must be checked externally. Do not combine imported copies with app invoices a second time." : "Inte en fullständig deklaration, årsredovisning eller löneberäkning. Ingående balanser, bokslutsposter, upplysningar, delägarjusteringar och källornas fullständighet måste kontrolleras externt. Räkna inte importerade kopior och appfakturor en gång till.",
  ].join("\n");
}
