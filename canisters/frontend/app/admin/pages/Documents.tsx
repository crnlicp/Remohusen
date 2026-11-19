import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, Download, Eye, FileText, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { backend, unwrap, type BusinessDocument, type DocumentInput, type DocumentLine, type DocumentSettings, type DocumentSummary } from "../../lib/api";
import { calculateTotals, decimal, defaultDocumentSettings, documentKinds, downloadBlob, isDocumentKind, isInvoice, kindLabel, money, newInput, newLine, paidOre, retentionDate, sampleDocument, scaled, serialise, today } from "../../lib/documents";
import { focusInvalidField, validDocumentDate, validateDocument, validateDocumentSettings, type FieldErrors } from "../../lib/documentValidation";
import { useAdmin } from "../auth";
import { Card, Field, PageHeader, TextInput, useToast } from "../components/ui";
import { Choice, DocumentSettingsEditor } from "../documents/Settings";
import { Obligations, Preparation } from "../documents/Preparation";
import { Spinner } from "../../components/Layout";
import { renderDocumentPdf } from "../documents/Pdf";
import { useAdminLanguage } from "../language";
import { CollectionDrawer, CollectionRow } from "../components/CollectionLayout";

function AmountInput({ label, value, decimals = 2, onChange, name, error: fieldError }: { label: string; value: bigint; decimals?: number; onChange: (value: bigint) => void; name?: string; error?: string }) {
  const { t: adminText } = useAdminLanguage();
  const [text, setText] = useState(decimal(value, decimals));
  const [error, setError] = useState("");
  useEffect(() => setText(decimal(value, decimals)), [value, decimals]);
  return <Field label={label} error={fieldError || adminText(error, { "0": decimals })}><input name={name} aria-invalid={fieldError || error ? true : undefined} className="input" inputMode="decimal" placeholder={decimals === 3 ? "1.000" : "0.00"} value={text} onChange={(e) => {
    setText(e.target.value);
    try { scaled(e.target.value, decimals); setError(""); e.target.setCustomValidity(""); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message.startsWith("Enter a non-negative number") ? "Enter a non-negative number with at most {0} decimals" : message); e.target.setCustomValidity(message);
    }
  }} onBlur={() => { if (!error) onChange(scaled(text, decimals)); }} /></Field>;
}
export default function DocumentsPage() {
  const { language, t: adminText } = useAdminLanguage();
  const { call, content } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState("documents");
  const [settings, setSettings] = useState<DocumentSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState(false);
  const [rows, setRows] = useState<DocumentSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<bigint | undefined>();
  const [offset, setOffset] = useState(0n);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [settingsErrors, setSettingsErrors] = useState<FieldErrors>({});
  const editor = useRef<HTMLDivElement>(null);
  const delivery = useRef<HTMLDivElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  const [showDelivery, setShowDelivery] = useState(false);
  const [doc, setDoc] = useState<BusinessDocument | null>(null);
  const [input, setInput] = useState<DocumentInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [preview, setPreview] = useState<{ url: string; blob: Blob; filename: string; sample: boolean } | null>(null);
  const [payment, setPayment] = useState({ date: today(), amountOre: 0n, reference: "" });
  const [archiveReference, setArchiveReference] = useState("");
  const [einvoiceReference, setEinvoiceReference] = useState("");
  const [acceptanceReference, setAcceptanceReference] = useState("");

  const loadRows = useCallback(async () => {
    const result = await call(async (t) => unwrap(await backend.adminListDocuments(t, offset)));
    setRows(result.items); setNextOffset(result.nextOffset);
  }, [call, offset]);
  useEffect(() => {
    if (!content) return;
    call(async (t) => unwrap(await backend.adminGetDocumentSettings(t))).then((s) => {
      setSettings(s ?? defaultDocumentSettings(content.settings, content.contact)); setSavedSettings(!!s);
    }, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [call, content]);
  useEffect(() => { loadRows().catch((e) => setError(e instanceof Error ? e.message : String(e))); }, [loadRows]);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);
  function select(d: BusinessDocument | null, draft?: DocumentInput) {
    if (!d || d.id !== doc?.id) setPayment({ date: today(), amountOre: 0n, reference: "" });
    setDoc(d); setInput(draft ?? d?.input ?? null); setShareUrl(""); setPreview(null);
    setFieldErrors({}); setError(""); setEditorOpen(!!d || !!draft); setShowDelivery(false);
    setEditorSession((version) => version + 1);
    setArchiveReference(d?.evidence.archiveReference ?? ""); setEinvoiceReference(d?.evidence.einvoiceReference ?? "");
    setAcceptanceReference(d?.evidence.acceptanceReference ?? "");
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try {
      await action();
    } catch (e) {
      toast.err(e); setError(e instanceof Error ? e.message : String(e));
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("invoice series cannot be renamed")) {
        setSettingsErrors({ invoicePrefix: message }); setTab("settings");
      } else if (message.includes("Payment reference already") || message.includes("Payment exceeds")) {
        const errors = { [message.includes("reference") ? "payment.reference" : "payment.amountOre"]: message };
        setFieldErrors(errors);
        requestAnimationFrame(() => { if (delivery.current) focusInvalidField(delivery.current, errors); });
      }
    }
    finally { setBusy(false); }
  }
  function validate(issuing = false) {
    if (!input || !settings) throw new Error(adminText("Choose a document first"));
    const errors = validateDocument(input, settings, issuing);
    setFieldErrors(errors);
    const invalid = editor.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:invalid, textarea:invalid");
    if (Object.keys(errors).length || invalid) {
      requestAnimationFrame(() => { if (editor.current) focusInvalidField(editor.current, errors); });
      throw new Error(adminText("Correct the highlighted fields before continuing."));
    }
    if (issuing) {
      const errors = validateDocumentSettings(settings, isInvoice(input.kind));
      if (Object.keys(errors).length) {
        setSettingsErrors(errors); setTab("settings");
        throw new Error(adminText("Complete the highlighted company settings before issuing."));
      }
    }
  }
  function mayReplaceDraft() {
    const changedDraft = input && doc?.issuedAt === undefined && serialise(input) !== serialise(doc?.input);
    const changedDelivery = doc?.issuedAt !== undefined && (archiveReference !== doc.evidence.archiveReference ||
      einvoiceReference !== doc.evidence.einvoiceReference || acceptanceReference !== doc.evidence.acceptanceReference ||
      payment.amountOre !== 0n || payment.reference !== "" || payment.date !== today());
    return !changedDraft && !changedDelivery || window.confirm(adminText("Discard unsaved document changes?"));
  }
  function closeEditor() {
    if (!busy && mayReplaceDraft()) select(null);
  }
  function openDocument(id: bigint, sharing = false) {
    if (!mayReplaceDraft()) return;
    void run(async () => {
      select(await call(async (t) => unwrap(await backend.adminGetDocument(t, id))));
      setShowDelivery(sharing);
    });
  }
  async function showPreview(d: BusinessDocument, sample = false) {
    const blob = await pdfBlob(d);
    setPreview({ url: URL.createObjectURL(blob), blob, filename: `${d.number || "DRAFT"}-${d.input.kind}.pdf`, sample });
  }
  async function downloadDocument(d: BusinessDocument) {
    downloadBlob(await pdfBlob(d), `${d.number || "DRAFT"}-${d.input.kind}.pdf`);
  }
  function deleteDraft(id: bigint) {
    if (!window.confirm(adminText("Delete this unissued draft?"))) return;
    void run(async () => {
      unwrap(await call((t) => backend.adminDeleteDocumentDraft(t, id)));
      if (doc?.id === id) select(null);
      await loadRows();
      toast.ok(adminText("Draft deleted"));
    });
  }
  async function reloadDoc(id: bigint) {
    select(await call(async (t) => unwrap(await backend.adminGetDocument(t, id))));
    await loadRows();
  }
  async function saveDraft() {
    if (!input) throw new Error(adminText("Choose a document first"));
    validate();
    const saved = await call(async (t) => unwrap(await backend.adminSaveDocument(t, doc?.id ?? 0n, doc?.revision ?? 0n, input)));
    select(saved); await loadRows(); return saved;
  }
  async function pdfBlob(d: BusinessDocument) {
    return renderDocumentPdf(d);
  }
  function displayDocument(): BusinessDocument {
    if (!settings || !input) throw new Error(adminText("Choose a document"));
    if (doc?.issuedAt !== undefined) return doc;
    return { id: doc?.id ?? 0n, revision: doc?.revision ?? 0n, input, brand: settings.brand, totals: calculateTotals(input), number: "", sourceNumber: "", createdAt: 0n,
      pdfReady: false, pdfHash: "", pdfChunks: 0n, payments: [], evidence: { archiveReference: "", einvoiceReference: "", acceptanceReference: "" }, events: [] };
  }
  if (!settings) return <><PageHeader title={adminText("Documents")} />{error ? <p role="alert" className="text-red-200">{adminText(error)}</p> : <Spinner />}</>;
  const locked = doc?.issuedAt !== undefined;
  const visible = rows.filter((r) => `${r.customerName} ${r.number} ${r.title} ${r.issueDate}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || filter === r.kind) && (status === "all" || status === "draft" && !r.issued || status === "issued" && r.issued ||
      status === "unarchived" && r.issued && !r.archived));
  const field = (name: string) => ({ name, error: fieldErrors[name] ? adminText(fieldErrors[name]) : undefined });
  const clearFieldError = (target: EventTarget) => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      setFieldErrors((previous) => {
        if (!previous[target.name]) return previous;
        const next = { ...previous }; delete next[target.name]; return next;
      });
    }
  };
  const set = (patch: Partial<DocumentInput>) => { if (input) setInput({ ...input, ...patch }); };
  const setLine = (index: number, patch: Partial<DocumentLine>) => { if (input) set({ lines: input.lines.map((l, i) => i === index ? { ...l, ...patch } : l) }); };
  const exportArchive = async (d: BusinessDocument) => {
    if (d.input.issueDate > settings.financialYearEnd) throw new Error(adminText("Select the correct accounting financial year end before exporting"));
    await downloadDocument(d);
    downloadBlob(new Blob([serialise({ ...d, shareHash: undefined, selectedFinancialYearEnd: settings.financialYearEnd, reviewRetentionThrough: retentionDate(settings.financialYearEnd), externalArchive: settings.archiveService, status: "exported-not-yet-acknowledged; verify selected financial year and retention with accountant" })], { type: "application/json" }), `${d.number}-archive.json`);
    toast.ok(adminText("Exported PDF and record. Archive remains pending until you record the receiving service reference."));
  };
  const editorActions = input && <>
    {!locked && <><button disabled={busy} className="btn btn-primary" onClick={() => void run(async () => { await saveDraft(); select(null); toast.ok(adminText("Draft saved")); })}>{adminText("Save draft")}</button>
      <button disabled={busy} className="btn btn-primary" onClick={() => void run(async () => {
        validate(true);
        if (!window.confirm(adminText("Issue and permanently lock this document? Invoice numbers cannot be reused. The PDF will be generated from the frozen issue-time details whenever previewed or downloaded."))) return;
        const saved = await saveDraft(); const issued = await call(async (t) => unwrap(await backend.adminIssueDocument(t, saved.id, saved.revision)));
        select(issued); await loadRows(); toast.ok(adminText("Document issued. Its PDF will be generated when previewed or downloaded."));
      })}>{adminText("Issue document")}</button></>}
    <button disabled={busy} className="btn btn-ghost" onClick={() => void run(async () => { if (!locked) validate(); await showPreview(displayDocument()); })}><Eye className="h-4 w-4" />{adminText("Preview PDF")}</button>
    <button disabled={busy} className="btn btn-ghost" onClick={() => void run(async () => { if (!locked) validate(); await downloadDocument(displayDocument()); })}><Download className="h-4 w-4" />{adminText(locked ? "Download PDF" : "Download draft PDF")}</button>
    <button className="btn btn-ghost" disabled={busy} onClick={closeEditor}>{adminText("Close")}</button>
  </>;
  return <>
    <div inert={editorOpen && tab === "documents" || !!preview}>
    <PageHeader title={adminText("Documents")} description={adminText("Customer documents, private preparation and Swedish KB obligations.")} actions={tab === "documents" &&
      <button disabled={busy || !savedSettings || !settings.privacyApproved} className="btn btn-primary" onClick={() => { if (mayReplaceDraft()) select(null, newInput(settings)); }}><Plus className="h-4 w-4" />{adminText("New {0}", { "0": adminText("Document").toLowerCase() })}</button>} />
    <p className="mb-4 rounded-xl border border-amber-400/30 p-3 text-sm text-amber-200">{adminText("Preparation workspace, not a statutory archive or filing service. Use your accounting service for public-sector structured e-invoices. Anyone holding a customer link can view its PDF until expiry/revocation.")}</p>
    <div className="mb-5 flex flex-wrap gap-2">{[["documents", adminText("Customer documents")], ["preparation", adminText("Accounting & tax")], ["obligations", adminText("Obligations")], ["settings", adminText("Document settings")]].map(([key, title]) => <button key={key} className={`btn ${tab === key ? "btn-primary" : "btn-ghost"}`} onClick={() => { setTab(key); setShareUrl(""); }}>{title}</button>)}</div>
    {error && (!editorOpen || tab !== "documents") && <p role="alert" className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{adminText(error)}</p>}
    {tab === "settings" && <DocumentSettingsEditor settings={settings} initialErrors={settingsErrors} busy={busy} save={(value) => run(async () => {
      unwrap(await call((t) => backend.adminSaveDocumentSettings(t, value))); setSettings(value); setSavedSettings(true); setSettingsErrors({}); toast.ok(adminText("Document settings saved"));
    })} />}
    {tab === "obligations" && <Obligations settings={settings} />}
    {tab === "preparation" && <Preparation settings={settings} />}
    {tab === "documents" && <div className="space-y-5">
      <details className="glass rounded-2xl p-4 text-sm text-slate-300">
        <summary className="cursor-pointer font-semibold text-brand-300">{adminText("How documents work")}</summary>
        <p className="my-4">{adminText("Drafts and frozen issued-document details are stored in the backend canister. PDFs are generated on demand in this browser; issued PDFs use the content and branding saved at issue time. Save issued PDFs to your accounting archive.")}</p>
        <ol className="mb-5 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <li>{adminText("1. Create a document or open a saved draft.")}</li>
          <li>{adminText("2. Enter details, preview the PDF and save your draft.")}</li>
          <li>{adminText("3. Issue to lock the document, then preview, download or share its generated PDF.")}</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className="btn btn-ghost" onClick={() => void run(() => showPreview(sampleDocument(settings, language), true))}><Eye className="h-4 w-4" />{adminText("Preview sample PDF")}</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">{adminText("Sample previews use fictional details and are never saved. Placeholders are examples, not actual document values.")}</p>
      </details>
      {(!savedSettings || !settings.privacyApproved) && <Card><p className="text-amber-200">{adminText("Complete Document settings and confirm privacy/archive arrangements before saving customer records.")}</p><button className="btn btn-primary mt-3" onClick={() => setTab("settings")}>{adminText("Configure documents")}</button></Card>}
      <Card title={adminText("Search and filters")}>
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <TextInput label={adminText("Search this page")} placeholder={adminText("Customer, document number, title or date…")} value={search} onChange={setSearch} />
          <Choice label={adminText("Document type")} value={filter} options={[["all", adminText("All")], ...Object.keys(documentKinds).map((k): [string, string] => [k, kindLabel(k, language)])]} onChange={setFilter} />
          <Choice label={adminText("Status")} value={status} options={[["all", adminText("All")], ["draft", adminText("Draft")], ["issued", adminText("Issued")], ["unarchived", adminText("Issued, archive pending")]]} onChange={setStatus} />
        </div>
      </Card>
      {visible.length ? <ul className="space-y-3" aria-label={adminText("Saved documents")}>
        {visible.map((row) => <CollectionRow key={row.id.toString()} onOpen={() => { if (!busy) openDocument(row.id); }} summary={{
          title: `${row.number || `${adminText("Draft")} #${row.id}`} · ${row.title}`,
          subtitle: `${row.customerName} · ${row.issueDate} · ID ${row.id}`,
          icon: <FileText className="h-7 w-7" />,
          badges: [{ text: kindLabel(row.kind, language) }, { text: row.issued ? adminText("Issued") : adminText("Draft"), tone: row.issued ? "green" : "amber" },
            ...(row.issued && !row.archived ? [{ text: adminText("Issued, archive pending"), tone: "amber" as const }] : [])],
        }} actions={<>
          <button disabled={busy} className="btn btn-ghost px-3" aria-label={adminText(row.issued ? "View document" : "Edit")} title={adminText(row.issued ? "View document" : "Edit")} onClick={() => openDocument(row.id)}>{row.issued ? <FileText className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button>
          <button disabled={busy} className="btn btn-ghost px-3" aria-label={adminText("Preview PDF")} title={adminText("Preview PDF")} onClick={() => void run(async () => showPreview(await call(async (t) => unwrap(await backend.adminGetDocument(t, row.id)))))}><Eye className="h-4 w-4" /></button>
          <button disabled={busy} className="btn btn-ghost px-3" aria-label={adminText(row.issued ? "Download PDF" : "Download draft PDF")} title={adminText("Download PDF")} onClick={() => void run(async () => downloadDocument(await call(async (t) => unwrap(await backend.adminGetDocument(t, row.id)))))}><Download className="h-4 w-4" /></button>
          {row.issued && <>
            <button disabled={busy} className="btn btn-ghost px-3" aria-label={adminText("Sharing and payments")} title={adminText("Sharing and payments")} onClick={() => openDocument(row.id, true)}><Link2 className="h-4 w-4" /></button>
            <button disabled={busy} className="btn btn-ghost px-3" aria-label={adminText("Export PDF + archive record")} title={adminText("Export PDF + archive record")} onClick={() => void run(async () => exportArchive(await call(async (t) => unwrap(await backend.adminGetDocument(t, row.id)))))}><Archive className="h-4 w-4" /></button>
          </>}
          <button disabled={busy || row.issued} className="btn btn-danger px-3" aria-label={adminText(row.issued ? "Issued documents cannot be deleted" : "Delete draft")} title={adminText(row.issued ? "Issued documents cannot be deleted" : "Delete draft")} onClick={() => deleteDraft(row.id)}><Trash2 className="h-4 w-4" /></button>
        </>} />)}
      </ul> : <div className="glass rounded-2xl p-10 text-center text-slate-400">{adminText(rows.length ? "No matching documents on this page." : "No documents yet. Create the first one.")}</div>}
        <p className="mt-3 text-xs text-slate-400">{adminText("Page {page}. Search and filters apply to this page (up to 25 records).", { page: offset / 25n + 1n })}</p>
        <div className="mt-3 flex gap-2"><button disabled={busy || offset === 0n} className="btn btn-ghost" onClick={() => setOffset(offset > 25n ? offset - 25n : 0n)}>{adminText("Previous")}</button><button disabled={busy || nextOffset === undefined} className="btn btn-ghost" onClick={() => { if (nextOffset !== undefined) setOffset(nextOffset); }}>{adminText("Next")}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void run(loadRows)}>{adminText("Refresh")}</button></div>
    </div>}
    </div>
    <CollectionDrawer open={!!input && editorOpen && tab === "documents"} active={!preview} busy={busy} onClose={closeEditor}
      initialFocus={showDelivery ? shareButton : undefined} title={locked ? `${doc?.number} · ${input?.title}` : adminText(doc ? "Edit document" : "New document")} footer={editorActions}>
      {error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{adminText(error)}</p>}
      {input && <div ref={editor} id="document-editor" onInput={(e) => clearFieldError(e.target)}>
        <p className="mb-5 text-xs text-slate-400">{locked ? adminText("Issued documents are locked. Download or share the generated PDF below.") : doc ? adminText("Saved draft — changes must be saved.") : adminText("Unsaved draft — not yet in the document list.")}</p>
        <fieldset key={editorSession} disabled={busy || locked} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice label={adminText("Document type")} value={input.kind} options={Object.keys(documentKinds).map((k) => [k, kindLabel(k, language)])} onChange={(kind) => {
              if (!isDocumentKind(kind)) return;
              set({ kind, title: kindLabel(kind, input.language), lines: ["reminder", "payment", "letter", "handover"].includes(kind) ? [] : input.lines.length ? input.lines : [newLine()], rotOre: 0n });
            }} />
            <Choice label={adminText("Document language")} value={input.language} options={[["sv", "Svenska"], ["en", "English"]]} onChange={(language) => set({ language, title: kindLabel(input.kind, language) })} />
            <TextInput {...field("title")} label={adminText("Title")} placeholder={adminText("Invoice for renovation work")} maxLength={200} value={input.title} onChange={(title) => set({ title })} />
            <Choice {...field("customerType")} label={adminText("Customer type")} value={input.customerType} options={[["private", adminText("Private individual")], ["business", adminText("Business")], ["public", adminText("Public sector")]]} onChange={(customerType) => set({ customerType })} />
            <TextInput {...field("customerName")} label={adminText("Customer name")} placeholder={adminText("Example: Anna Andersson / Example AB")} maxLength={200} value={input.customerName} onChange={(customerName) => set({ customerName })} />
            <TextInput {...field("customerAddress")} label={adminText("Customer address")} placeholder="Exempelgatan 1, 123 45 Stockholm" maxLength={500} value={input.customerAddress} onChange={(customerAddress) => set({ customerAddress })} />
            <TextInput {...field("customerVat")} label={adminText("Customer VAT number")} placeholder="SE123456789001" maxLength={30} value={input.customerVat} onChange={(customerVat) => set({ customerVat })} />
            <TextInput label={adminText("Project / property reference (no personal identity number)")} placeholder={adminText("Example: Kitchen renovation, property reference")} maxLength={300} value={input.project} onChange={(project) => set({ project })} />
            <TextInput {...field("issueDate")} label={adminText("Issue date")} type="date" placeholder="YYYY-MM-DD" value={input.issueDate} onChange={(issueDate) => set({ issueDate })} />
            <TextInput {...field("supplyDate")} label={adminText("Supply / work / advance date")} type="date" placeholder="YYYY-MM-DD" value={input.supplyDate} onChange={(supplyDate) => set({ supplyDate })} />
            <TextInput {...field("dueDate")} label={input.kind === "quote" ? adminText("Valid until") : adminText("Due date")} type="date" placeholder="YYYY-MM-DD" value={input.dueDate} onChange={(dueDate) => set({ dueDate })} />
            <TextInput {...field("sourceId")} label={adminText("Original document ID (for credit / reminder / payment / change)")} placeholder={adminText("Example: 1 (ID in the saved document list)")} value={input.sourceId?.toString() ?? ""} onChange={(v) => { if (v === "" || /^\d+$/.test(v)) set({ sourceId: v ? BigInt(v) : undefined }); }} />
          </div>
          {input.lines.map((line, index) => <div key={index} className="rounded-xl border border-white/10 p-4">
            <TextInput {...field(`lines.${index}.description`)} label={adminText("Line {index} — description / scope", { index: index + 1 })} placeholder={adminText("Example: Renovation labour, 2 hours")} maxLength={1000} value={line.description} onChange={(description) => setLine(index, { description })} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <AmountInput {...field(`lines.${index}.quantityMilli`)} label={adminText("Quantity")} decimals={3} value={line.quantityMilli} onChange={(quantityMilli) => setLine(index, { quantityMilli })} />
              <AmountInput {...field(`lines.${index}.unitOre`)} label={adminText("Unit price excl. VAT (SEK)")} value={line.unitOre} onChange={(unitOre) => setLine(index, { unitOre })} />
              <AmountInput {...field(`lines.${index}.discountBps`)} label={adminText("Discount (%)")} value={line.discountBps} onChange={(discountBps) => setLine(index, { discountBps })} />
              <Choice label={adminText("Cost category")} value={line.category} options={[["labour", adminText("Labour")], ["material", adminText("Materials")], ["other", adminText("Other / travel")]]} onChange={(category) => setLine(index, { category })} />
              <Choice {...field(`lines.${index}.treatment`)} label={adminText("VAT treatment")} value={line.treatment} options={[["standard", adminText("Standard VAT")], ["reverse", adminText("Construction reverse charge")], ["exempt", adminText("Exempt (review required)")]]} onChange={(treatment) => setLine(index, { treatment, vatBps: treatment === "standard" ? 2500n : 0n })} />
              {line.treatment === "standard" ? <Choice label={adminText("VAT rate")} value={line.vatBps.toString()} options={[["2500", "25%"], ["1200", "12%"], ["600", "6%"]]} onChange={(v) => setLine(index, { vatBps: BigInt(v) })} /> : <TextInput {...field(`lines.${index}.exemptionReason`)} label={adminText("Exemption / tax reason")} placeholder={adminText("Applicable exemption and legal basis")} value={line.exemptionReason} onChange={(exemptionReason) => setLine(index, { exemptionReason })} />}
            </div>
            <button type="button" className="btn btn-ghost mt-3" onClick={() => set({ lines: input.lines.filter((_, i) => i !== index) })}>{adminText("Remove line")}</button>
          </div>)}
          {!["reminder", "payment"].includes(input.kind) && <div><button name="lines" data-error-focus tabIndex={0} aria-invalid={fieldErrors.lines ? true : undefined} className={`btn btn-ghost ${fieldErrors.lines ? "border-red-400" : ""}`} disabled={input.lines.length >= 100} onClick={() => set({ lines: [...input.lines, newLine()] })}>{adminText("Add line")}</button>{fieldErrors.lines && <p role="alert" className="mt-1 text-xs text-red-200">{adminText(fieldErrors.lines)}</p>}</div>}
          {input.lines.some((l) => l.treatment === "reverse") && <Field label={adminText("Reverse-charge eligibility")} error={field("reverseChargeConfirmed").error}><input className="input h-5 w-5" name="reverseChargeConfirmed" aria-invalid={!!fieldErrors.reverseChargeConfirmed} type="checkbox" checked={input.reverseChargeConfirmed} onChange={(e) => set({ reverseChargeConfirmed: e.target.checked })} />{" "}{adminText("I verified that the buyer and supplied construction services qualify for reverse charge.")}</Field>}
          {input.kind === "rot" && <div className="space-y-3 rounded-xl border border-amber-400/30 p-4">
            <AmountInput {...field("rotOre")} label={adminText("Preliminary ROT deduction (SEK)")} value={input.rotOre} onChange={(rotOre) => set({ rotOre })} />
            <Field label={adminText("ROT eligibility")} error={field("rotConfirmed").error}><input className="input h-5 w-5" name="rotConfirmed" aria-invalid={!!fieldErrors.rotConfirmed} type="checkbox" checked={input.rotConfirmed} onChange={(e) => set({ rotConfirmed: e.target.checked })} />{" "}{adminText("I reviewed 2026 eligibility, property/work and customer agreement/allowance. This workspace supports one customer's preliminary deduction, not an automatic tax entitlement decision.")}</Field>
            <p className="text-xs text-amber-200">{adminText("30% of eligible labour, max SEK 50,000; other years, multiple-owner splits and ROT credits require the accountant's workflow. Keep personal identity numbers and claim/payment decisions in the accounting service.")}</p>
          </div>}
          {(["reminder", "payment"].includes(input.kind)) && <p className="text-sm text-amber-200">{adminText("Amount is frozen from the original invoice's recorded payments/credits at issue. No fees or interest are added.")}</p>}
          <Field label={adminText("Terms / scope / acceptance information")}><textarea rows={4} maxLength={4000} className="input" placeholder={adminText("Describe the agreed scope, payment terms and acceptance conditions…")} value={input.terms} onChange={(e) => set({ terms: e.target.value })} /></Field>
          <Field label={adminText("Customer-visible notes")}><textarea rows={4} maxLength={4000} className="input" placeholder={adminText("Optional information shown to the customer…")} value={input.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
          <TextInput label={adminText("Private admin notes (never included in PDF)")} placeholder={adminText("Internal reference or follow-up notes…")} maxLength={2000} value={input.internalNotes} onChange={(internalNotes) => set({ internalNotes })} />
        </fieldset>
      </div>}
      {doc && locked && <div ref={delivery} onInput={(e) => clearFieldError(e.target)}><Card title={adminText("Delivery, payment and external evidence")}>
        <p className="text-sm text-slate-400">{adminText("PDFs are generated on demand from the frozen issue-time document and branding. Save each issued PDF to your accounting archive.")}</p>
        {doc.input.customerType === "public" && <p className="mt-3 text-amber-200">{adminText("Structured e-invoice required. Use your accounting service; PDF sharing is not delivery of the legal e-invoice.")}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={shareButton} disabled={busy} className="btn btn-primary" onClick={() => void run(async () => {
            const shared = await call(async (t) => unwrap(await backend.adminShareDocument(t, doc.id)));
            setShareUrl(`${window.location.origin}/documents#${shared.token}`);
            toast.ok(adminText("New bearer link created for 30 days; previous link revoked."));
          })}>{adminText("Create / rotate 30-day link")}</button>
          <button disabled={busy} className="btn btn-ghost" onClick={() => void run(async () => { unwrap(await call((t) => backend.adminRevokeDocumentShare(t, doc.id))); setShareUrl(""); await reloadDoc(doc.id); toast.ok(adminText("Link revoked; downloaded copies cannot be recalled.")); })}>{adminText("Revoke link")}</button>
          <button disabled={busy} className="btn btn-ghost" onClick={() => void run(() => exportArchive(doc))}>{adminText("Export PDF + archive record")}</button>
          <button disabled={busy} className="btn btn-ghost" onClick={() => select(null, { ...doc.input, kind: "invoice", title: kindLabel("invoice", doc.input.language), sourceId: doc.id, issueDate: today(), dueDate: newInput(settings).dueDate, rotOre: 0n, rotConfirmed: false, internalNotes: "" })}>{adminText("Copy to new invoice")}</button>
          <button disabled={busy} className="btn btn-ghost" onClick={() => select(null, { ...doc.input, kind: "order", title: kindLabel("order", doc.input.language), sourceId: doc.id, issueDate: today(), dueDate: newInput(settings).dueDate, rotOre: 0n, rotConfirmed: false, internalNotes: "" })}>{adminText("Copy to order confirmation")}</button>
          <button disabled={busy} className="btn btn-ghost" onClick={() => select(null, { ...doc.input, kind: "credit", title: kindLabel("credit", doc.input.language), sourceId: doc.id, rotOre: 0n, issueDate: today(), internalNotes: "" })}>{adminText("Create linked credit")}</button>
        </div>
        {shareUrl && <div className="mt-4"><TextInput label={adminText("Customer link — share only with the intended recipient")} readOnly value={shareUrl} onChange={() => {}} /><button className="btn btn-ghost mt-2" onClick={() => void run(async () => { await navigator.clipboard.writeText(shareUrl); toast.ok(adminText("Link copied")); })}>{adminText("Copy link")}</button></div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <TextInput label={adminText("Archive receipt/reference (only after received)")} maxLength={500} placeholder={adminText("Example: Archive receipt ARC-2026-001")} value={archiveReference} onChange={setArchiveReference} />
          <TextInput label={adminText("Accounting-service e-invoice receipt/reference")} maxLength={500} placeholder={adminText("Example: Delivery receipt from accounting service")} value={einvoiceReference} onChange={setEinvoiceReference} />
          <TextInput label={adminText("Acceptance / external correction / filing evidence reference")} maxLength={500} placeholder={adminText("Example: Approved order or filing receipt")} value={acceptanceReference} onChange={setAcceptanceReference} />
        </div>
        <button className="btn btn-ghost mt-3" disabled={busy} onClick={() => void run(async () => {
          unwrap(await call((t) => backend.adminSaveDocumentEvidence(t, doc.id, { archiveReference, einvoiceReference, acceptanceReference }))); await reloadDoc(doc.id); toast.ok(adminText("External evidence references recorded"));
        })}>{adminText("Record evidence")}</button>
        <p className="mt-5 text-sm">{adminText("Recorded customer payments:")}{" "}{money(paidOre(doc))} / {money(doc.totals.payableOre)}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TextInput {...field("payment.date")} label={adminText("Payment date")} type="date" placeholder="YYYY-MM-DD" value={payment.date} onChange={(date) => setPayment({ ...payment, date })} />
          <AmountInput {...field("payment.amountOre")} label={adminText("Received amount (SEK)")} value={payment.amountOre} onChange={(amountOre) => setPayment({ ...payment, amountOre })} />
          <TextInput {...field("payment.reference")} label={adminText("Unique bank/payment reference")} maxLength={300} placeholder={adminText("Example: Bank transaction reference")} value={payment.reference} onChange={(reference) => setPayment({ ...payment, reference })} />
        </div>
        <button disabled={busy || !isInvoice(doc.input.kind) || doc.input.kind === "credit"} className="btn btn-ghost mt-3" onClick={() => void run(async () => {
          const errors: FieldErrors = {};
          if (!validDocumentDate(payment.date)) errors["payment.date"] = "Enter a valid date.";
          if (payment.amountOre <= 0n) errors["payment.amountOre"] = "Enter an amount greater than zero.";
          if (!payment.reference.trim()) errors["payment.reference"] = "This field is required.";
          setFieldErrors(errors);
          if (Object.keys(errors).length || delivery.current?.querySelector("input:invalid")) {
            requestAnimationFrame(() => { if (delivery.current) focusInvalidField(delivery.current, errors); });
            throw new Error(adminText("Correct the highlighted fields before continuing."));
          }
          unwrap(await call((t) => backend.adminRecordDocumentPayment(t, doc.id, payment))); await reloadDoc(doc.id); setPayment({ date: today(), amountOre: 0n, reference: "" }); toast.ok(adminText("Payment recorded"));
        })}>{adminText("Record payment")}</button>
        <details className="mt-5 break-all text-xs text-slate-400"><summary>{adminText("Audit history / payment allocations")}</summary>{doc.payments.map((p) => <p key={p.reference}>{p.date} · {money(p.amountOre)} · {p.reference}</p>)}{doc.events.map((e, i) => <p key={i}>{new Date(Number(e.at / 1_000_000n)).toLocaleString()} · {e.action} · {e.detail}</p>)}</details>
      </Card></div>}
    </CollectionDrawer>
    <CollectionDrawer open={!!preview} title={adminText(preview?.sample ? "Sample PDF preview" : "Document PDF preview")} onClose={() => setPreview(null)} footer={<>
      <button className="btn btn-primary" disabled={!preview} onClick={() => { if (preview) downloadBlob(preview.blob, preview.filename); }}><Download className="h-4 w-4" />{adminText("Download PDF")}</button>
      <button className="btn btn-ghost" onClick={() => setPreview(null)}>{adminText("Close")}</button>
    </>}>
      {preview && <><p className="break-all text-sm text-slate-400">{preview.filename}</p><iframe className="h-[650px] w-full rounded-xl bg-white" src={preview.url} title={adminText(preview.sample ? "Sample PDF preview" : "Document PDF preview")} /></>}
    </CollectionDrawer>
  </>;
}
