import { useEffect, useState } from "react";
import { backend, unwrap, type SharedDocumentInfo } from "../lib/api";
import { downloadBlob } from "../lib/documents";
import { renderDocumentPdf } from "../admin/documents/Pdf";

const token = window.location.hash.slice(1);
window.history.replaceState(null, "", "/documents");

export default function SharedDocumentPage() {
  const [info, setInfo] = useState<SharedDocumentInfo | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("This link is invalid, revoked or expired. Request a new link from the sender.");
      const metadata = unwrap(await backend.getSharedDocument(token));
      const blob = await renderDocumentPdf(metadata);
      if (active) { setInfo(metadata); setFile(blob); }
    }
    load().catch((e) => { if (active) setError(e instanceof Error ? e.message : String(e)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <main className="mx-auto max-w-4xl p-6">
    <h1 className="text-2xl font-bold">{info?.title ?? "Document / Dokument"}</h1>
    {error ? <p role="alert" className="mt-5 text-red-200">{error}</p> : !file || !info ? <p className="mt-5">Loading document / Hämtar dokument…</p> : <>
      <p className="mt-3 text-sm text-slate-400">{info.number} · {info.language === "en" ? "Link expires" : "Länken upphör"} {new Date(Number(info.expiresAt / 1_000_000n)).toLocaleDateString(info.language === "en" ? "en-GB" : "sv-SE")}</p>
      <button className="btn btn-primary mt-5" onClick={() => downloadBlob(file, `${info.number}.pdf`)}>{info.language === "en" ? "Download PDF" : "Ladda ner PDF"}</button>
      <p className="mt-4 text-xs text-slate-400">{info.language === "en" ? "Generated from the document details and branding saved when it was issued. Private bearer link: do not forward it. Downloaded copies cannot be recalled. Viewing does not mean acceptance or payment." : "Genererad från dokumentuppgifterna och företagsprofilen som sparades när dokumentet utfärdades. Privat länk: vidarebefordra den inte. Nedladdade kopior kan inte återkallas. Visning innebär inte godkännande eller betalning."}</p>
      {preview && <iframe src={preview} title="PDF" className="mt-5 h-[750px] w-full rounded-xl bg-white" />}
    </>}
  </main>;
}
