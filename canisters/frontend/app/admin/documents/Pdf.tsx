import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import regular from "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?inline";
import bold from "@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?inline";
import defaultLogo from "../../../public/logo-192.png?inline";
import type { DocumentBrand, DocumentInput, DocumentTotals } from "../../lib/api";
import { kindLabel, lineAmounts, money, decimal } from "../../lib/documents";
import { documentLetterhead, LETTERHEAD_FIT_ERROR } from "../../lib/documentLetterhead";

Font.register({ family: "Noto", fonts: [{ src: regular }, { src: bold, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => word.length > 30 ? word.match(/.{1,20}/g) ?? [word] : [word]);
const styles = StyleSheet.create({
  page: { fontFamily: "Noto", fontSize: 9, paddingHorizontal: 42, color: "#1e293b" },
  header: { position: "absolute", top: 30, left: 42, right: 42 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  logoSlot: { width: 78, height: 54, justifyContent: "center", alignItems: "flex-start" },
  logo: { width: 65, height: 52, objectFit: "contain" },
  brandText: { flexGrow: 1, flexShrink: 1 },
  company: { color: "#0b1220", fontSize: 16, fontWeight: 700, lineHeight: 1.15 },
  tagline: { color: "#64748b", fontSize: 8.5, marginTop: 4 },
  rule: { flexDirection: "row", height: 2, marginTop: 13 },
  ruleGold: { width: 58, backgroundColor: "#fbbf24" },
  ruleOrange: { width: 24, backgroundColor: "#f97316" },
  ruleRest: { flexGrow: 1, backgroundColor: "#e2e8f0" },
  footer: { position: "absolute", bottom: 26, left: 42, right: 42, fontSize: 7.3, color: "#475569" },
  footerColumns: { flexDirection: "row", marginTop: 8 },
  footerLeft: { width: "50%", paddingRight: 12 },
  footerRight: { width: "50%", paddingLeft: 12 },
  footerCompany: { fontWeight: 700, color: "#0b1220", marginBottom: 2 },
  footerNote: { marginTop: 3 },
  pageNumber: { marginTop: 4, color: "#64748b" },
  eyebrow: { color: "#b45309", fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" },
  title: { color: "#0b1220", fontSize: 22, fontWeight: 700, lineHeight: 1.15, marginBottom: 15 },
  block: { marginBottom: 14 },
  info: { flexDirection: "row", backgroundColor: "#f4f6f9", borderRadius: 4, padding: 12, marginBottom: 12 },
  recipient: { width: "54%", paddingRight: 14 },
  metadata: { width: "46%", paddingLeft: 12, borderLeft: "1 solid #dbe3eb" },
  label: { color: "#64748b", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4, textTransform: "uppercase" },
  detail: { marginBottom: 3 },
  tableHead: { flexDirection: "row", backgroundColor: "#0b1220", color: "#ffffff", borderRadius: 3, paddingVertical: 7, paddingHorizontal: 8 },
  row: { flexDirection: "row", borderBottom: "0.5 solid #e2e8f0", paddingVertical: 8, paddingHorizontal: 8 },
  rowAlternate: { backgroundColor: "#f8fafc" },
  desc: { width: "43%", paddingRight: 8 }, cell: { width: "19%", textAlign: "right", paddingLeft: 4 },
  secondary: { color: "#64748b", fontSize: 8, marginTop: 2 },
  totals: { marginTop: 7, marginBottom: 16 },
  total: { textAlign: "right", marginTop: 5 },
  totalDue: { borderTop: "1 solid #fbbf24", paddingTop: 8, marginTop: 9, fontSize: 10, color: "#0b1220" },
  strong: { fontWeight: 700 },
  warning: { color: "#9a3412", marginBottom: 12 },
  draft: { alignSelf: "flex-start", fontSize: 8.5, fontWeight: 700, color: "#9a3412", backgroundColor: "#fff1df", paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3, marginBottom: 12 },
});
type PdfDocument = {
  input: Omit<DocumentInput, "internalNotes" | "reverseChargeConfirmed" | "rotConfirmed">;
  brand: DocumentBrand;
  totals: DocumentTotals;
  number: string;
  sourceNumber: string;
  issuedAt?: bigint;
};
export function PdfFrame({ brand, en, children }: { brand: DocumentBrand; en: boolean; children: React.ReactNode }) {
  const { company, tagline, address, contact, registration, footerNote, paddingTop, paddingBottom, fits } = documentLetterhead(brand, en);
  if (!fits) throw new Error(LETTERHEAD_FIT_ERROR);
  return <Page size="A4" style={[styles.page, { paddingTop, paddingBottom }]}>
    <View fixed style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoSlot}><Image src={brand.logoData || defaultLogo} style={styles.logo} /></View>
        <View style={styles.brandText}>
          <Text style={styles.company}>{company}</Text>
          {!!tagline && <Text style={styles.tagline}>{tagline}</Text>}
        </View>
      </View>
      <View style={styles.rule}><View style={styles.ruleGold} /><View style={styles.ruleOrange} /><View style={styles.ruleRest} /></View>
    </View>
    {children}
    <View fixed style={styles.footer}>
      <View style={[styles.rule, { marginTop: 0 }]}><View style={styles.ruleGold} /><View style={styles.ruleOrange} /><View style={styles.ruleRest} /></View>
      <View style={styles.footerColumns}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerCompany}>{company}</Text>
          {!!address && <Text>{address}</Text>}
          {!!contact && <Text>{contact}</Text>}
        </View>
        <View style={styles.footerRight}>
          {!!registration && <Text>{registration}</Text>}
          {!!footerNote && <Text style={styles.footerNote}>{footerNote}</Text>}
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${en ? "Page" : "Sida"} ${pageNumber} / ${totalPages}`} />
        </View>
      </View>
    </View>
  </Page>;
}
export function BusinessPdf({ doc }: { doc: PdfDocument }) {
  const d = doc.input, en = d.language === "en";
  const t = (sv: string, english: string) => en ? english : sv;
  const groups = new Map<string, { base: bigint; vat: bigint; text: string }>();
  for (const line of d.lines) {
    const amounts = lineAmounts(line);
    const key = `${line.treatment}-${line.vatBps}-${line.exemptionReason}`;
    const previous = groups.get(key);
    groups.set(key, {
      base: (previous?.base ?? 0n) + amounts.net, vat: (previous?.vat ?? 0n) + amounts.vat,
      text: line.treatment === "standard" ? `${decimal(line.vatBps)}%` : line.treatment === "reverse" ? t("Omvänd betalningsskyldighet", "Reverse charge") : line.exemptionReason,
    });
  }
  const sign = d.kind === "credit" ? -1n : 1n;
  return <Document title={`${d.title} ${doc.number}`} author={doc.brand.legalName}>
    <PdfFrame brand={doc.brand} en={en}>
      {doc.issuedAt === undefined && <Text style={styles.draft}>{t("UTKAST - inte utfärdad", "DRAFT - not issued")}</Text>}
      <Text style={styles.eyebrow}>{kindLabel(d.kind, d.language)}</Text>
      <Text style={styles.title}>{d.title || kindLabel(d.kind, d.language)}</Text>
      <View style={styles.info}>
        <View style={styles.recipient}>
          <Text style={styles.label}>{t("Mottagare", "Recipient")}</Text>
          <Text style={styles.strong}>{d.customerName}</Text>
          {!!d.customerAddress && <Text>{d.customerAddress}</Text>}
          {!!d.customerVat && <Text>VAT: {d.customerVat}</Text>}
        </View>
        <View style={styles.metadata}>
          <Text style={styles.label}>{t("Dokumentuppgifter", "Document details")}</Text>
          <Text>{t("Nummer", "Number")}: {doc.number || t("Utkast", "Draft")}</Text>
          <Text>{t("Datum", "Date")}: {d.issueDate}</Text>
          {!!d.supplyDate && <Text>{t("Leverans-/arbets-/förskottsdatum", "Supply/work/advance date")}: {d.supplyDate}</Text>}
          {!!d.dueDate && <Text>{t(d.kind === "quote" ? "Giltig till" : "Förfallodatum", d.kind === "quote" ? "Valid until" : "Due date")}: {d.dueDate}</Text>}
        </View>
      </View>
      {(d.project || d.sourceId !== undefined) && <View style={styles.block}>
        {!!d.project && <Text style={styles.detail}>{t("Projekt", "Project")}: {d.project}</Text>}
        {d.sourceId !== undefined && <Text>{t("Ursprunglig dokumentreferens", "Original document reference")}: {doc.sourceNumber || `#${d.sourceId}`}</Text>}
      </View>}
      {d.customerType === "public" && <Text style={styles.warning}>{t("PDF-kopia. Strukturerad e-faktura skickas separat via redovisningstjänsten.", "PDF copy. Structured e-invoice is sent separately through the accounting service.")}</Text>}
      {d.lines.length > 0 && <View style={[styles.tableHead, styles.strong]}><Text style={styles.desc}>{t("Beskrivning", "Description")}</Text><Text style={styles.cell}>{t("Antal", "Quantity")}</Text><Text style={styles.cell}>{t("À-pris exkl. moms", "Unit price excl. VAT")}</Text><Text style={styles.cell}>{t("Belopp exkl. moms", "Amount excl. VAT")}</Text></View>}
      {d.lines.map((line, i) => <View key={i} style={[styles.row, ...(i % 2 ? [styles.rowAlternate] : [])]}>
        <View style={styles.desc}><Text>{line.description}</Text><Text style={styles.secondary}>{line.category === "labour" ? t("Arbete", "Labour") : line.category === "material" ? t("Material", "Materials") : t("Övrigt", "Other")}{line.discountBps > 0n ? ` | ${t("Rabatt", "Discount")} ${decimal(line.discountBps)}%` : ""}</Text></View>
        <Text style={styles.cell}>{decimal(line.quantityMilli, 3)}</Text><Text style={styles.cell}>{money(sign * line.unitOre, d.language)}</Text><Text style={styles.cell}>{money(sign * lineAmounts(line).net, d.language)}</Text>
      </View>)}
      {d.lines.length > 0 && <View style={styles.totals}>
        <Text style={styles.total}>{t("Summa exkl. moms", "Net total")}: {money(sign * doc.totals.netOre, d.language)}</Text>
        {[...groups.entries()].map(([key, group]) => <Text style={styles.total} key={key}>{t("Moms", "VAT")} {group.text} ({t("underlag", "base")} {money(sign * group.base, d.language)}): {money(sign * group.vat, d.language)}</Text>)}
        <Text style={styles.total}>{t("Totalt inkl. moms", "Gross total")}: {money(sign * doc.totals.grossOre, d.language)}</Text>
        {d.rotOre > 0n && <Text style={styles.total}>ROT ({t("preliminärt", "preliminary")}): -{money(d.rotOre, d.language)}</Text>}
        <Text style={[styles.total, styles.totalDue, styles.strong]}>{t(d.kind === "credit" ? "Krediterat belopp" : "Att betala", d.kind === "credit" ? "Credited amount" : "Amount payable")}: {money(sign * doc.totals.payableOre, d.language)}</Text>
      </View>}
      {["payment", "reminder"].includes(d.kind) && <Text style={[styles.block, styles.strong]}>{d.kind === "payment" ? t("Registrerade betalningar vid utfärdandet", "Payments recorded at issue") : t("Utestående belopp vid utfärdandet", "Outstanding at issue")}: {money(doc.totals.payableOre, d.language)}</Text>}
      {d.rotOre > 0n && <Text style={[styles.warning, styles.block]}>{t("ROT är preliminärt och gäller endast godkänd arbetskostnad. Kunden betalar resterande belopp om Skatteverket inte beviljar avdraget. Nytt utrymme hos andra utförare kan inte kontrolleras här.", "ROT is preliminary and applies only to eligible labour. The customer pays the remaining amount if Skatteverket does not approve the deduction. Available allowance at other suppliers cannot be verified here.")}</Text>}
      {d.terms && <View style={styles.block}><Text style={styles.strong}>{t("Villkor", "Terms")}</Text><Text>{d.terms}</Text></View>}
      {d.notes && <Text style={styles.block}>{d.notes}</Text>}
      {d.lines.length > 0 && <Text style={styles.block}>{doc.brand.paymentDetails}</Text>}
      <Text style={{ fontSize: 7, color: "#64748b" }}>KB-2026-v1</Text>
    </PdfFrame>
  </Document>;
}
export async function renderDocumentPdf(doc: PdfDocument): Promise<Blob> {
  if (!documentLetterhead(doc.brand, doc.input.language === "en").fits) throw new Error(LETTERHEAD_FIT_ERROR);
  return pdf(<BusinessPdf doc={doc} />).toBlob();
}
export async function renderPreparationPdf(brand: DocumentBrand, title: string, text: string, language: string): Promise<Blob> {
  if (!documentLetterhead(brand, language === "en").fits) throw new Error(LETTERHEAD_FIT_ERROR);
  return pdf(<Document title={title}><PdfFrame brand={brand} en={language === "en"}><Text style={styles.title}>{title}</Text><Text style={styles.warning}>{language === "en" ? "PREPARATION ONLY - NOT FILED" : "ENDAST UNDERLAG - EJ INLÄMNAD"}</Text><Text>{text}</Text></PdfFrame></Document>).toBlob();
}
