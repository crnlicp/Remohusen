import { useAdminLanguage } from "../language";
import { useState } from "react";
import type { DocumentSettings } from "../../lib/api";
import { csvHeader, sampleCsv, importAccounting, preparationText, type AccountingImport } from "../../lib/accountingPreparation";
import { downloadBlob, money, retentionDate, serialise } from "../../lib/documents";
import { Card, Field, TextInput, useToast } from "../components/ui";
import { renderPreparationPdf } from "./Pdf";

export const obligations = [
  { title: "Registration and genuine official originals", when: "All KBs", text: "Keep Bolagsverket registration, signatory/partner changes, beneficial-owner records where applicable, and Skatteverket F-tax/VAT/employer decisions in your existing approved archive. This app cannot issue these certificates.", url: "https://www.skatteverket.se/foretag/drivaforetag/foretagsformer/handelsbolag.4.5c13cb6b1198121ee8580002532.html" },
  { title: "Bookkeeping and annual closing", when: "All KBs", text: "Record every transaction with evidence. Prepare annual accounts. A legal-person partner or qualifying company size can require an annual report; an accountant must select the correct framework, disclosures, audit and filing requirements.", url: "https://www.bfn.se/redovisningsregler/vad-galler-for/handelsbolag/" },
  { title: "INK4R / INK4S / INK4DU and partner returns", when: "All KBs; actual adjustments vary", text: "Prepare the KB schedules. The INK4 first page is needed for applicable tax/fee bases. Individual partners use N3A; legal-person partners use N3B. Partner drawings are not normal employee salary. KB loss restrictions and allocations require accountant review.", url: "https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraatetthandelsbolag" },
  { title: "VAT and construction reverse charge", when: "VAT registration / qualifying transactions", text: "Submit VAT for each registered reporting period, including nil returns when required. Construction reverse charge is not applicable to every business customer. Cross-border transactions may add periodic statements and other obligations.", url: "https://www.skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet" },
  { title: "ROT eligibility and payment request", when: "Eligible private-customer renovation work", text: "Separate labour from materials/travel. Check F-tax, property/work eligibility, customer agreement and allowance. Current 2026 guidance: 30% of eligible labour, max SEK 50,000 ROT per person/year (combined ROT/RUT SEK 75,000). New construction is not eligible. Apply only after completed work and qualifying payment; keep request/decision references in the accounting service.", url: "https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut" },
  { title: "Payroll / AGI and employment records", when: "Employees or other reportable remuneration", text: "Use approved payroll software for payslips, withholding, employer contributions and monthly reporting. Keep employment agreements and required work-environment records privately. Imported AGI totals here are reconciliation only.", url: "https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration" },
  { title: "Public-sector structured e-invoices", when: "Covered public procurement", text: "A PDF/share link is not a structured e-invoice. Send through your existing accounting service and record its actual reference/receipt here. Sharing never marks the e-invoice as delivered.", url: "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-20181277-om-elektroniska-fakturor-till_sfs-2018-1277/" },
  { title: "Consumer contracts and change orders", when: "Consumer work / distance or off-premises agreements", text: "Document scope, price, dates, terms and ÄTA approvals. Provide current cancellation information/forms and record consent where applicable. These documents do not provide BankID signatures or legal advice.", url: "https://www.konsumentverket.se/varor-och-tjanster/anlita-hantverkare/" },
  { title: "Construction personnel register and site records", when: "According to site responsibilities and exemptions", text: "Use your compliant personnel-register service. Keep applicable site registration, work-environment plans, building-control and inspection records. Only responsible authorised parties can issue regulated trade certificates.", url: "https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html" },
  { title: "Cash register / receipts", when: "Cash/card/Swish sales unless exempt", text: "Assess cash-register obligations and exemptions with the accountant. A payment-confirmation PDF from this app is not a certified cash-register receipt.", url: "https://www.skatteverket.se/foretag/drivaforetag/kassaregister.4.121b82f011a74172e5880005263.html" },
  { title: "Statutory archive and privacy", when: "All accounting information", text: "Keep the legal archive in your accounting service. Retention generally runs to seven years after the calendar year in which the financial year ends. ICP replication does not prove Swedish storage/GDPR compliance. Confirm location, processing, access and export arrangements before real data.", url: "https://www.bfn.se/fragor-och-svar/arkivering/" },
];

export function Obligations({ settings }: { settings: DocumentSettings }) {
  const { t: adminText } = useAdminLanguage();
  const profile: Record<string, string> = { unknown: "Not yet confirmed", yes: "Yes", no: "No", individuals: "Individuals only", legal: "Legal persons", mixed: "Individuals and legal persons" };
  return <div className="space-y-4">
    <Card title={adminText("Applicability profile")}>
      <p>{adminText("VAT:")}{" "}{adminText(profile[settings.vatRegistered] ?? settings.vatRegistered)}{" "}{adminText("· Employees:")}{" "}{adminText(profile[settings.employees] ?? settings.employees)}{" "}{adminText("· Partners:")}{" "}{adminText(profile[settings.partnerType] ?? settings.partnerType)}</p>
      <p className="mt-2 text-sm text-amber-200">{adminText("Unknown answers require review. This is a core checklist, not every industry/site-specific obligation. No government filings are made here.")}</p>
      <p className="mt-2 text-sm">{adminText("Selected year end:")}{" "}{settings.financialYearEnd}{adminText(". Retain applicable records through")}{" "}{retentionDate(settings.financialYearEnd)}{" "}{adminText("in")}{" "}{settings.archiveService || adminText("your accounting archive")}.</p>
    </Card>
    {obligations.map((item) => <Card title={adminText(item.title)} key={item.title}><p className="mb-2 text-xs text-brand-300">{adminText(item.when)}</p><p className="text-sm text-slate-300">{adminText(item.text)}</p><a className="mt-3 inline-block text-sm text-brand-300 underline" href={item.url} target="_blank" rel="noreferrer">{adminText("Official guidance")}</a></Card>)}
  </div>;
}
export function Preparation({ settings }: { settings: DocumentSettings }) {
  const { t: adminText } = useAdminLanguage();
  const toast = useToast();
  const [data, setData] = useState<AccountingImport | null>(null);
  const [csv, setCsv] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState("VAT");
  const [language, setLanguage] = useState("sv");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function exportPack(pdf: boolean) {
    setBusy(true);
    try {
      if (!data || !confirmed) throw new Error(adminText("Validate the import and confirm source completeness/reconciliation"));
      const text = preparationText(data, report, reviewer, notes, language);
      if (pdf) {
        downloadBlob(await renderPreparationPdf(settings.brand, `${report} - ${data.start} / ${data.end}`, text, language), `${report}-preparation.pdf`);
      } else {
        downloadBlob(new Blob([serialise({ status: "preparation-not-filed", sourceName, report, reviewer, notes, company: data.company, start: data.start, end: data.end, fields: [...data.fields], text })], { type: "application/json" }), `${report}-preparation.json`);
      }
    } catch (e) { toast.err(e); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <Card title={adminText("Private accounting preparation — not a filing service")}>
      <p className="text-sm text-slate-300">{adminText("Imports remain in this browser's memory and are cleared when you leave this tab. Do not include personal identity numbers or raw payroll identities. Use complete accountant-approved ledger/payroll summaries, not customer invoices alone. Your accounting software remains the source and legal archive.")}</p>
      <p className="mt-3 text-xs text-slate-400">{adminText("Canonical CSV, comma-separated, quoted fields supported, integer öre, max 5 MB / 10,000 rows. Explicit report mappings: VAT:10:- means credit minus debit to VAT box 10. Separate multiple mappings with semicolons. Use NONE for reviewed non-reporting records. Field codes/mappings require accountant approval; they are not inferred or validated as an official return.")}</p>
      <code className="mt-3 block overflow-x-auto text-xs">{csvHeader}</code>
      <button className="btn btn-ghost mt-3" onClick={() => downloadBlob(new Blob([sampleCsv], { type: "text/csv" }), "accounting-import-example.csv")}>{adminText("Download synthetic CSV example")}</button>
      <Field label={adminText("CSV source (local only)")}><input className="input mt-4" type="file" accept=".csv,text/csv" onChange={(e) => {
        const file = e.target.files?.[0];
        setData(null); setConfirmed(false);
        if (!file) return;
        if (file.size > 5_000_000) { toast.err(adminText("CSV exceeds 5 MB")); return; }
        file.text().then((text) => { setCsv(text); setSourceName(file.name); }, toast.err);
      }} /></Field>
      <button className="btn btn-primary mt-3" disabled={!csv} onClick={() => {
        try { setData(importAccounting(csv, settings.brand.orgNumber, settings.financialYearEnd)); setConfirmed(false); } catch (e) { setData(null); toast.err(e); }
      }}>{adminText("Validate and preview mappings")}</button>
    </Card>
    {data && <Card title={adminText("Import preview")}>
      <p>{sourceName} · {data.start} — {data.end} · {data.rows.length}{" "}{adminText("rows")}</p>
      <p className="mt-2 text-sm">{adminText("Debit")}{" "}{money(data.debit)}{" "}{adminText("· Credit")}{" "}{money(data.credit)}</p>
      {data.errors.length > 0 ? <ul className="mt-3 max-h-60 overflow-auto text-sm text-red-200">{data.errors.map((error, i) => <li key={i}>{error}</li>)}</ul> : <p className="mt-3 text-sm text-amber-200">{adminText("Structural checks passed. Completeness, account mapping, reporting periods and tax correctness still require review.")}</p>}
      <div className="mt-3 max-h-48 overflow-auto text-xs">{[...data.fields].map(([key, value]) => <p key={key}>{key}: {money(value)}</p>)}</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={adminText("Preparation output")}><select className="input" value={report} onChange={(e) => setReport(e.target.value)}>{["VAT", "YEAR-END", "INK4R", "INK4S", "INK4DU", "N3A", "N3B", "AGI"].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label={adminText("Language")}><select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}><option value="sv">Svenska</option><option value="en">English</option></select></Field>
        <TextInput label={adminText("Reviewer / accountant reference")} value={reviewer} onChange={setReviewer} />
        <TextInput label={adminText("Reconciliation, completeness and adjustments")} value={notes} onChange={setNotes} />
      </div>
      <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />{adminText("I have checked the complete source period, opening/closing entries, bank/tax reconciliation, payroll totals where applicable and report mappings. App invoices are not counted twice.")}</label>
      <div className="mt-4 flex gap-2"><button disabled={busy || data.errors.length > 0 || !confirmed} className="btn btn-primary" onClick={() => void exportPack(true)}>{adminText("Download preparation PDF")}</button><button disabled={busy || data.errors.length > 0 || !confirmed} className="btn btn-ghost" onClick={() => void exportPack(false)}>{adminText("Export review pack")}</button></div>
    </Card>}
  </div>;
}
