import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Random "mo:core/Random";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Sha256 "mo:sha2/Sha256";
import Types "../types";
import AuthLib "../lib/Auth";
import Docs "../lib/Documents";

mixin (auth : Types.AuthState, documentState : Types.DocumentState) {
  func event(doc : Types.BusinessDocument, action : Text, detail : Text) : [Types.DocumentEvent] {
    let previous = if (doc.events.size() >= 199) doc.events.sliceToArray(Nat.sub(doc.events.size(), 199), doc.events.size()) else doc.events;
    previous.concat([{ at = Time.now(); action; detail }]);
  };

  func hashToken(token : Text) : Text {
    let h = Sha256.new();
    h.writeBlob(token.encodeUtf8());
    AuthLib.toHex(h.sum());
  };

  func sharedRecord(token : Text) : ?(Types.BusinessDocument, Types.DocumentShare) {
    if (token.size() != 64) return null;
    let settings = documentState.settings ?? return null;
    if (not settings.privacyApproved) return null;
    let share = documentState.shares.get(hashToken(token)) ?? return null;
    if (not Docs.shareActive(share.expiresAt, Time.now())) return null;
    let doc = documentState.records.get(share.documentId) ?? return null;
    if (not doc.pdfReady) return null;
    ?(doc, share);
  };

  public query func adminGetDocumentSettings(token : Text) : async Result.Result<?Types.DocumentSettings, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    #ok(documentState.settings);
  };

  public shared func adminSaveDocumentSettings(token : Text, settings : Types.DocumentSettings) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    switch (Docs.validateSettings(settings)) { case (?e) return #err e; case null {} };
    switch (documentState.settings) {
      case (?old) {
        if (documentState.nextNumber > 1 and old.invoicePrefix != settings.invoicePrefix) return #err "An issued invoice series cannot be renamed";
      };
      case null {};
    };
    documentState.settings := ?settings;
    #ok(());
  };

  public query func adminListDocuments(token : Text, offset : Nat) : async Result.Result<{ items : [Types.DocumentSummary]; nextOffset : ?Nat }, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let end = Nat.min(offset + 25, documentState.nextId);
    if (offset >= documentState.nextId) return #ok { items = []; nextOffset = null };
    var rows : [Types.DocumentSummary] = [];
    for (id in Nat.range(offset + 1, end + 1)) {
      switch (documentState.records.get(id)) {
        case (?d) rows := rows.concat([{
          id = d.id; kind = d.input.kind; title = d.input.title; number = d.number;
          customerName = d.input.customerName; issueDate = d.input.issueDate;
          issued = d.issuedAt != null; pdfReady = d.pdfReady; archived = d.evidence.archiveReference != "";
        }]);
        case null {};
      };
    };
    #ok { items = rows; nextOffset = if (end < documentState.nextId) ?end else null };
  };

  public query func adminGetDocument(token : Text, id : Nat) : async Result.Result<Types.BusinessDocument, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    #ok(documentState.records.get(id) ?? return #err "Document not found");
  };

  public shared func adminSaveDocument(token : Text, id : Nat, revision : Nat, input : Types.DocumentInput) : async Result.Result<Types.BusinessDocument, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let settings = documentState.settings ?? return #err "Configure document settings first";
    if (not settings.privacyApproved) return #err "Confirm privacy, storage and archive arrangements in Document settings first";
    switch (Docs.validateInput(input, settings, false)) { case (?e) return #err e; case null {} };
    let now = Time.now();
    let existing = if (id == 0) null else documentState.records.get(id);
    if (id != 0 and existing == null) return #err "Document not found";
    switch (existing) {
      case (?d) {
        if (d.issuedAt != null) return #err "Issued documents are immutable; create a credit or a new document";
        if (d.revision != revision) return #err "Document changed; reload before saving";
        let updated = { d with input; brand = settings.brand; totals = Docs.totals(input); revision = d.revision + 1; events = event(d, "draft-saved", "") };
        documentState.records.add(id, updated);
        #ok updated;
      };
      case null {
        if (documentState.records.size() >= 1000) return #err "Workspace limit reached (1000 documents); retain records in your accounting archive";
        let newId = documentState.nextId;
        documentState.nextId += 1;
        let doc : Types.BusinessDocument = {
          id = newId; revision = 1; input; brand = settings.brand; totals = Docs.totals(input);
          number = ""; sourceNumber = ""; issuedAt = null; createdAt = now; pdfReady = false; pdfHash = ""; pdfChunks = 0;
          shareHash = null; payments = [];
          evidence = { archiveReference = ""; einvoiceReference = ""; acceptanceReference = "" };
          events = [{ at = now; action = "draft-created"; detail = Docs.templateVersion }];
        };
        documentState.records.add(newId, doc);
        #ok doc;
      };
    };
  };

  public shared func adminDeleteDocumentDraft(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.issuedAt != null) return #err "Issued documents cannot be deleted";
    documentState.records.remove(id);
    #ok(());
  };

  public shared func adminIssueDocument(token : Text, id : Nat, revision : Nat) : async Result.Result<Types.BusinessDocument, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.issuedAt != null) return #ok doc;
    if (doc.revision != revision) return #err "Document changed; reload before issuing";
    let settings = documentState.settings ?? return #err "Configure document settings first";
    if (not settings.privacyApproved) return #err "Privacy/storage approval is required";
    switch (Docs.validateInput(doc.input, settings, true)) { case (?e) return #err e; case null {} };
    var sourceNumber = "";
    var issuedTotals = doc.totals;
    switch (doc.input.sourceId) {
      case (?sourceId) {
        let source = documentState.records.get(sourceId) ?? return #err "Original document not found";
        if (source.issuedAt == null) return #err "The original document must be issued";
        sourceNumber := source.number;
        if (doc.input.kind == "credit") {
          if (not Docs.isInvoice(source.input.kind) or source.input.kind == "credit") return #err "Credit requires an original invoice";
          if (source.input.customerName != doc.input.customerName or source.input.customerAddress != doc.input.customerAddress) return #err "Credit customer must match the original invoice";
          var credited = 0;
          var creditedNet = 0;
          var creditedVat = 0;
          for (other in documentState.records.values()) {
            if (other.issuedAt != null and other.input.kind == "credit" and other.input.sourceId == ?sourceId) {
              credited += other.totals.grossOre;
              creditedNet += other.totals.netOre;
              creditedVat += other.totals.vatOre;
            };
          };
          if (credited + doc.totals.grossOre > source.totals.grossOre or creditedNet + doc.totals.netOre > source.totals.netOre or creditedVat + doc.totals.vatOre > source.totals.vatOre) return #err "Credit exceeds the remaining original invoice net/VAT/gross amount";
          if (source.input.rotOre > 0) return #err "ROT credit adjustments require your accountant's workflow; record the corrected external reference instead";
        };
        if (doc.input.kind == "payment" and source.payments.size() == 0) return #err "Record a payment on the original invoice first";
        if (doc.input.kind == "payment" or doc.input.kind == "reminder") {
          if (not Docs.isInvoice(source.input.kind) or source.input.kind == "credit") return #err "Select an original invoice";
          if (source.input.customerName != doc.input.customerName or source.input.customerAddress != doc.input.customerAddress) return #err "Customer must match the original invoice";
          var paid = 0;
          var credited = 0;
          for (p in source.payments.values()) paid += p.amountOre;
          for (other in documentState.records.values()) {
            if (other.issuedAt != null and other.input.kind == "credit" and other.input.sourceId == ?sourceId) credited += other.totals.payableOre;
          };
          let remaining = if (paid + credited >= source.totals.payableOre) 0 else Nat.sub(source.totals.payableOre, paid + credited);
          if (doc.input.kind == "reminder" and remaining == 0) return #err "Nothing is outstanding on this invoice";
          let amount = if (doc.input.kind == "payment") paid else remaining;
          issuedTotals := { netOre = amount; vatOre = 0; grossOre = amount; payableOre = amount };
        };
      };
      case null {
        if (Docs.member(doc.input.kind, ["credit", "reminder", "payment", "change"])) return #err "This document requires an original document reference";
      };
    };
    if (doc.input.kind == "reminder" or doc.input.kind == "payment") {
      if (doc.input.lines.size() != 0) return #err "Payment confirmations/reminders use the original invoice and its recorded payments; remove editable line items";
    };
    let number = if (Docs.isInvoice(doc.input.kind)) {
      let n = settings.invoicePrefix # documentState.nextNumber.toText();
      documentState.nextNumber += 1;
      n;
    } else { "DOC-" # id.toText() };
    let updated = {
      doc with number; sourceNumber; totals = issuedTotals; brand = settings.brand; issuedAt = ?Time.now(); revision = doc.revision + 1;
      events = event(doc, "issued-pdf-pending", Docs.templateVersion);
    };
    documentState.records.add(id, updated);
    #ok updated;
  };

  public shared func adminUploadDocumentPdf(token : Text, id : Nat, index : Nat, chunk : Blob) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.issuedAt == null or doc.pdfReady) return #err "Only pending issued PDFs can be uploaded";
    if (chunk.size() == 0 or chunk.size() > 200_000) return #err "PDF chunk must be 1-200000 bytes";
    let file = documentState.files.get(id) ?? ({ chunks = []; size = 0 } : Types.DocumentFile);
    if (index < file.chunks.size()) {
      if (file.chunks[index] == chunk) return #ok(());
      return #err "Upload conflict; reset the pending PDF upload";
    };
    if (index != file.chunks.size()) return #err "PDF chunks must be uploaded in order";
    if (file.size + chunk.size() > 4_000_000) return #err "PDF exceeds 4 MB";
    documentState.files.add(id, { chunks = file.chunks.concat([chunk]); size = file.size + chunk.size() });
    #ok(());
  };

  public shared func adminResetDocumentPdf(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.pdfReady) return #err "Final PDFs are immutable";
    documentState.files.remove(id);
    #ok(());
  };

  public shared func adminFinaliseDocumentPdf(token : Text, id : Nat, expectedHash : Text) : async Result.Result<Types.BusinessDocument, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.pdfReady) {
      if (doc.pdfHash != expectedHash) return #err "Document already has a different final PDF";
      return #ok doc;
    };
    let file = documentState.files.get(id) ?? return #err "Upload a PDF first";
    if (file.chunks.size() == 0 or file.chunks[0].size() < 5) return #err "Invalid PDF header";
    let prefix = file.chunks[0].toArray();
    if (prefix[0] != 37 or prefix[1] != 80 or prefix[2] != 68 or prefix[3] != 70 or prefix[4] != 45) return #err "Invalid PDF header";
    let h = Sha256.new();
    for (chunk in file.chunks.values()) h.writeBlob(chunk);
    let hash = AuthLib.toHex(h.sum());
    if (hash != expectedHash) return #err "PDF hash mismatch";
    let updated = { doc with pdfReady = true; pdfHash = hash; pdfChunks = file.chunks.size(); events = event(doc, "pdf-finalised", hash) };
    documentState.records.add(id, updated);
    #ok updated;
  };

  public query func adminDocumentPdfChunk(token : Text, id : Nat, index : Nat) : async Result.Result<Blob, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (not doc.pdfReady) return #err "PDF finalisation is pending";
    let file = documentState.files.get(id) ?? return #err "PDF not found";
    if (index >= file.chunks.size()) return #err "PDF chunk not found";
    #ok(file.chunks[index]);
  };

  public shared func adminShareDocument(token : Text, id : Nat) : async Result.Result<{ token : Text; expiresAt : Int }, Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let raw = AuthLib.toHex(await Random.blob());
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let settings = documentState.settings ?? return #err "Document settings missing";
    if (not settings.privacyApproved) return #err "Privacy/storage approval is required";
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (not doc.pdfReady) return #err "Finalise the issued PDF before sharing";
    switch (doc.shareHash) { case (?old) documentState.shares.remove(old); case null {} };
    let tokenHash = hashToken(raw);
    let expiresAt = Time.now() + Docs.shareTtl;
    documentState.shares.add(tokenHash, { documentId = id; expiresAt });
    documentState.records.add(id, { doc with shareHash = ?tokenHash; events = event(doc, "share-created", "30 days; bearer access") });
    #ok { token = raw; expiresAt };
  };

  public shared func adminRevokeDocumentShare(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    switch (doc.shareHash) { case (?old) documentState.shares.remove(old); case null {} };
    documentState.records.add(id, { doc with shareHash = null; events = event(doc, "share-revoked", "") });
    #ok(());
  };

  public query func getSharedDocument(token : Text) : async Result.Result<Types.SharedDocumentInfo, Text> {
    let (doc, share) = sharedRecord(token) ?? return #err "This link is invalid, revoked or expired";
    #ok { number = doc.number; title = doc.input.title; language = doc.input.language; hash = doc.pdfHash; chunks = doc.pdfChunks; expiresAt = share.expiresAt };
  };

  public query func getSharedDocumentPdfChunk(token : Text, index : Nat) : async Result.Result<Blob, Text> {
    let (doc, _) = sharedRecord(token) ?? return #err "This link is invalid, revoked or expired";
    let file = documentState.files.get(doc.id) ?? return #err "PDF unavailable";
    if (index >= file.chunks.size()) return #err "PDF chunk not found";
    #ok(file.chunks[index]);
  };

  public shared func adminRecordDocumentPayment(token : Text, id : Nat, payment : Types.DocumentPayment) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (doc.issuedAt == null or not Docs.isInvoice(doc.input.kind) or doc.input.kind == "credit") return #err "Payments require an issued original invoice";
    if (not Docs.dateValid(payment.date) or payment.amountOre == 0 or payment.reference == "" or payment.reference.size() > 300) return #err "Payment needs valid date, positive amount and reference";
    var paid = 0;
    var credited = 0;
    for (other in documentState.records.values()) {
      if (other.issuedAt != null and other.input.kind == "credit" and other.input.sourceId == ?id) credited += other.totals.payableOre;
    };
    for (p in doc.payments.values()) {
      if (p.reference == payment.reference) return #err "Payment reference already recorded";
      paid += p.amountOre;
    };
    if (paid + credited + payment.amountOre > doc.totals.payableOre or doc.payments.size() >= 100) return #err "Payment exceeds remaining payable amount or record limit";
    documentState.records.add(id, { doc with payments = doc.payments.concat([payment]); events = event(doc, "payment-recorded", payment.reference) });
    #ok(());
  };

  public shared func adminSaveDocumentEvidence(token : Text, id : Nat, evidence : Types.DocumentEvidence) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) return #err(AuthLib.unauthorized);
    let doc = documentState.records.get(id) ?? return #err "Document not found";
    if (evidence.archiveReference.size() > 500 or evidence.einvoiceReference.size() > 500 or evidence.acceptanceReference.size() > 500) return #err "Evidence references must be at most 500 characters";
    documentState.records.add(id, { doc with evidence; events = event(doc, "external-evidence-updated", "References supplied by admin; no automatic delivery claim") });
    #ok(());
  };
};
