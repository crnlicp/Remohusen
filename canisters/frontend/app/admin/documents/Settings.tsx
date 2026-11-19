import { useAdminLanguage } from "../language";
import { useEffect, useRef, useState } from "react";
import defaultLogo from "../../../public/logo-192.png?inline";
import type { DocumentSettings } from "../../lib/api";
import { Card, Field, L10nInput, TextInput, useToast } from "../components/ui";
import { focusInvalidField, validateDocumentSettings, type FieldErrors } from "../../lib/documentValidation";

export function Choice({ label, value, options, onChange, name, error }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void; name?: string; error?: string }) {
  return <Field label={label} error={error}><select className="input" name={name} aria-invalid={error ? true : undefined} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></Field>;
}
export function DocumentSettingsEditor({ settings, save, busy, initialErrors }: { settings: DocumentSettings; save: (value: DocumentSettings) => Promise<void>; busy: boolean; initialErrors?: FieldErrors }) {
  const { t: adminText } = useAdminLanguage();
  const [draft, setDraft] = useState(settings);
  const [paymentDaysText, setPaymentDaysText] = useState(settings.paymentDays.toString());
  const toast = useToast();
  const root = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const field = (name: string) => ({ name, error: errors[name] ? adminText(errors[name]) : undefined });
  useEffect(() => {
    if (!initialErrors || !Object.keys(initialErrors).length) return;
    setErrors(initialErrors);
    requestAnimationFrame(() => { if (root.current) focusInvalidField(root.current, initialErrors); });
  }, [initialErrors]);
  function submit() {
    const daysValid = /^\d+$/.test(paymentDaysText) && BigInt(paymentDaysText) <= 365n;
    const value = { ...draft, paymentDays: daysValid ? BigInt(paymentDaysText) : draft.paymentDays };
    const errors = validateDocumentSettings(value);
    if (!daysValid) errors.paymentDays = "Enter between 0 and 365 days.";
    setErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => { if (root.current) focusInvalidField(root.current, errors); });
      toast.err(adminText("Correct the highlighted fields before continuing."));
      return;
    }
    void save(value);
  }
  const brand = draft.brand;
  const setBrand = (patch: Partial<DocumentSettings["brand"]>) => setDraft({ ...draft, brand: { ...brand, ...patch } });
  async function logo(file?: File) {
    if (!file) return;
    try {
      if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2_000_000) throw new Error(adminText("Choose a PNG/JPEG logo under 2 MB"));
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(adminText("Image processing is unavailable"));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const data = canvas.toDataURL("image/png");
      if (data.length > 100_000) throw new Error(adminText("Logo is too detailed; choose a smaller image"));
      setBrand({ logoData: data });
    } catch (e) { toast.err(e); }
  }
  return <div ref={root} className="space-y-5" onInput={(e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      setErrors((previous) => { const next = { ...previous }; delete next[target.name]; return next; });
    }
  }}>
    <Card title={adminText("Private document settings")}>
      <p className="mb-5 text-sm text-slate-400">{adminText("Initial company/header/footer values come from Site settings and Contact. These private document settings are saved separately. Issued documents keep a frozen snapshot; later edits never rewrite them.")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput {...field("brand.legalName")} label={adminText("Registered KB legal name")} placeholder="Exempelföretag KB" maxLength={120} value={brand.legalName} onChange={(legalName) => setBrand({ legalName })} />
        <TextInput {...field("brand.orgNumber")} label={adminText("Organisation number")} placeholder="969XXX-XXXX" maxLength={30} value={brand.orgNumber} onChange={(orgNumber) => setBrand({ orgNumber })} />
        <TextInput {...field("brand.address")} label={adminText("Company address")} placeholder="Exempelvägen 2, 123 45 Stockholm" maxLength={250} value={brand.address} onChange={(address) => setBrand({ address })} />
        <TextInput {...field("brand.contact")} label={adminText("Contact details")} placeholder="info@example.se | 08-123 45 67" maxLength={200} value={brand.contact} onChange={(contact) => setBrand({ contact })} />
        <TextInput {...field("brand.vatNumber")} label={adminText("VAT registration number")} placeholder="SE969XXXXXXX01" maxLength={30} value={brand.vatNumber} onChange={(vatNumber) => setBrand({ vatNumber })} />
        <TextInput {...field("brand.paymentDetails")} label={adminText("Payment details (bankgiro / plusgiro / IBAN / reference instructions)")} maxLength={1000} value={brand.paymentDetails} onChange={(paymentDetails) => setBrand({ paymentDetails })} />
        <TextInput {...field("invoicePrefix")} label={adminText("Invoice prefix (cannot change after first issue)")} placeholder="RH-" maxLength={20} value={draft.invoicePrefix} onChange={(invoicePrefix) => setDraft({ ...draft, invoicePrefix })} />
        <TextInput {...field("paymentDays")} label={adminText("Payment days (0–365)")} placeholder="30" type="number" value={paymentDaysText} onChange={setPaymentDaysText} />
      </div>
      <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={brand.fTax} onChange={(e) => setBrand({ fTax: e.target.checked })} />{adminText("The company is approved for F-tax (verified against official registration).")}</label>
      <div className="mt-4 space-y-4">
        <L10nInput name="brand.header" errors={errors} multiline rows={2} label={adminText("Document header (max 200 characters per language)")} value={brand.header} onChange={(header) => setBrand({ header })} />
        <L10nInput name="brand.footer" errors={errors} multiline rows={3} label={adminText("Document footer (max 300 characters per language)")} value={brand.footer} onChange={(footer) => setBrand({ footer })} />
        <Field label={adminText("Embedded document logo (PNG/JPEG)")}><input type="file" accept="image/png,image/jpeg" onChange={(e) => void logo(e.target.files?.[0])} /></Field>
        <p className="text-sm text-slate-400">{adminText("The website logo is used by default. Upload a PNG/JPEG to replace it on newly generated PDFs.")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <img src={brand.logoData || defaultLogo} className="h-14 max-w-48 object-contain" alt={adminText("Document logo")} />
          <span className="text-sm text-slate-300">{adminText(brand.logoData ? "Custom logo" : "Website logo (default)")}</span>
          {brand.logoData && <button className="btn btn-ghost" onClick={() => setBrand({ logoData: "" })}>{adminText("Use default logo")}</button>}
        </div>
      </div>
    </Card>
    <Card title={adminText("Applicability and accounting source")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice {...field("vatRegistered")} label={adminText("VAT registered")} value={draft.vatRegistered} options={[["unknown", adminText("Not yet confirmed")], ["yes", adminText("Yes")], ["no", adminText("No")]]} onChange={(vatRegistered) => setDraft({ ...draft, vatRegistered })} />
        <Choice label={adminText("Employees / reportable remuneration")} value={draft.employees} options={[["unknown", adminText("Not yet confirmed")], ["yes", adminText("Yes")], ["no", adminText("No")]]} onChange={(employees) => setDraft({ ...draft, employees })} />
        <Choice label={adminText("Partner types")} value={draft.partnerType} options={[["unknown", adminText("Not yet confirmed")], ["individuals", adminText("Individuals only")], ["legal", adminText("Legal persons")], ["mixed", adminText("Individuals and legal persons")]]} onChange={(partnerType) => setDraft({ ...draft, partnerType })} />
        <Choice label={adminText("Accounting method")} value={draft.accountingMethod} options={[["unknown", adminText("Not yet confirmed")], ["invoice", adminText("Invoice method")], ["cash", adminText("Cash / year-end method")]]} onChange={(accountingMethod) => setDraft({ ...draft, accountingMethod })} />
        <Choice label={adminText("VAT reporting period")} value={draft.vatPeriod} options={[["unknown", adminText("Not yet confirmed")], ["month", adminText("Monthly")], ["quarter", adminText("Quarterly")], ["year", adminText("Yearly")]]} onChange={(vatPeriod) => setDraft({ ...draft, vatPeriod })} />
        <TextInput {...field("financialYearEnd")} label={adminText("Financial year end")} type="date" value={draft.financialYearEnd} onChange={(financialYearEnd) => setDraft({ ...draft, financialYearEnd })} />
        <TextInput {...field("archiveService")} label={adminText("Existing accounting/archive service")} maxLength={300} value={draft.archiveService} onChange={(archiveService) => setDraft({ ...draft, archiveService })} />
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm text-amber-200"><input name="privacyApproved" aria-invalid={!!errors.privacyApproved} className="input mt-1 h-5 w-5 shrink-0" type="checkbox" checked={draft.privacyApproved} onChange={(e) => setDraft({ ...draft, privacyApproved: e.target.checked })} />{adminText("I have verified storage location, data processing/privacy and archive/export arrangements with the responsible accountant/adviser, or am using synthetic local-test data only. This workspace is not the statutory archive. Real customer data must not be used before approval.")}</label>
      {errors.privacyApproved && <p role="alert" className="mt-1 text-xs text-red-200">{adminText(errors.privacyApproved)}</p>}
    </Card>
    <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? adminText("Saving…") : adminText("Save document settings")}</button>
  </div>;
}
