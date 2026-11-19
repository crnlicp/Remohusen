import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Types "../types";
import Validate "Validate";

module {
  public let templateVersion = "KB-2026-v1";
  public let shareTtl : Int = 2_592_000_000_000_000;
  public func shareActive(expiresAt : Int, now : Int) : Bool { expiresAt > now };

  public func member(value : Text, choices : [Text]) : Bool {
    for (choice in choices.values()) { if (value == choice) return true };
    false;
  };

  public func isInvoice(kind : Text) : Bool {
    member(kind, ["invoice", "advance", "progress", "final", "rot", "credit"]);
  };

  public func dateValid(date : Text) : Bool {
    let c = date.toArray();
    if (c.size() != 10 or c[4] != '-' or c[7] != '-') return false;
    var digits = "";
    for (i in Nat.range(0, 10)) {
      if (i != 4 and i != 7) {
        if (c[i] < '0' or c[i] > '9') return false;
        digits #= c[i].toText();
      };
    };
    let year = Nat.fromText(c[0].toText() # c[1].toText() # c[2].toText() # c[3].toText()) ?? 0;
    let month = Nat.fromText(c[5].toText() # c[6].toText()) ?? 0;
    let day = Nat.fromText(c[8].toText() # c[9].toText()) ?? 0;
    if (year < 2000 or year > 2100 or month < 1 or month > 12 or day < 1) return false;
    let leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0);
    let maxDay = if (month == 2) { if (leap) 29 else 28 } else if (member(month.toText(), ["4", "6", "9", "11"])) 30 else 31;
    day <= maxDay;
  };

  public func lineNet(line : Types.DocumentLine) : Nat {
    (line.quantityMilli * line.unitOre * (10_000 - line.discountBps) + 5_000_000) / 10_000_000;
  };

  public func lineVat(line : Types.DocumentLine) : Nat {
    if (line.treatment == "standard") (lineNet(line) * line.vatBps + 5_000) / 10_000 else 0;
  };

  public func totals(input : Types.DocumentInput) : Types.DocumentTotals {
    var netOre = 0;
    var vatOre = 0;
    for (line in input.lines.values()) {
      netOre += lineNet(line);
      vatOre += lineVat(line);
    };
    let grossOre = netOre + vatOre;
    { netOre; vatOre; grossOre; payableOre = if (input.rotOre <= grossOre) grossOre - input.rotOre else 0 };
  };

  public func validateSettings(s : Types.DocumentSettings) : ?Text {
    let b = s.brand;
    switch (Validate.first([
      Validate.textRequired(b.legalName, 120, "Legal company name"),
      Validate.textRequired(b.orgNumber, 30, "Organisation number"),
      Validate.textRequired(b.address, 250, "Company address"),
      Validate.textMax(b.contact, 200, "Company contact"),
      Validate.textMax(b.vatNumber, 30, "VAT number"),
      Validate.textMax(b.paymentDetails, 1000, "Payment details"),
      Validate.l10nMax(b.header, 200, "Document header"),
      Validate.l10nMax(b.footer, 300, "Document footer"),
      Validate.textMax(b.logoData, 100_000, "Logo"),
      Validate.textRequired(s.invoicePrefix, 20, "Invoice prefix"),
      Validate.textRequired(s.archiveService, 300, "Accounting/archive service"),
    ])) { case (?e) return ?e; case null {} };
    if (b.logoData != "" and not b.logoData.startsWith(#text "data:image/png;base64,") and not b.logoData.startsWith(#text "data:image/jpeg;base64,")) return ?"Logo must be an embedded PNG or JPEG";
    for (c in s.invoicePrefix.toIter()) {
      if (not (c.isAlphabetic() or c.isDigit() or c == '-')) return ?"Invoice prefix must contain letters, numbers or hyphens";
    };
    if (s.paymentDays > 365) return ?"Payment terms cannot exceed 365 days";
    if (not dateValid(s.financialYearEnd)) return ?"Financial year end must be a valid YYYY-MM-DD date";
    if (not member(s.vatRegistered, ["unknown", "yes", "no"]) or not member(s.employees, ["unknown", "yes", "no"])) return ?"Invalid registration profile";
    if (not member(s.partnerType, ["unknown", "individuals", "legal", "mixed"])) return ?"Invalid partner profile";
    if (not member(s.accountingMethod, ["unknown", "invoice", "cash"]) or not member(s.vatPeriod, ["unknown", "month", "quarter", "year"])) return ?"Invalid reporting profile";
    null;
  };

  public func validateInput(d : Types.DocumentInput, s : Types.DocumentSettings, issuing : Bool) : ?Text {
    if (not member(d.kind, ["quote", "order", "change", "invoice", "advance", "progress", "final", "rot", "credit", "reminder", "payment", "handover", "letter"])) return ?"Invalid document type";
    if (not member(d.language, ["sv", "en"]) or not member(d.customerType, ["private", "business", "public"])) return ?"Invalid language or customer type";
    switch (Validate.first([
      Validate.textRequired(d.title, 200, "Title"),
      Validate.textRequired(d.customerName, 200, "Customer name"),
      Validate.textMax(d.customerAddress, 500, "Customer address"),
      Validate.textMax(d.customerVat, 30, "Customer VAT number"),
      Validate.textMax(d.project, 300, "Project"),
      Validate.textMax(d.terms, 4000, "Terms"),
      Validate.textMax(d.notes, 4000, "Customer notes"),
      Validate.textMax(d.internalNotes, 2000, "Internal notes"),
    ])) { case (?e) return ?e; case null {} };
    if (not dateValid(d.issueDate)) return ?"Invalid issue date";
    if (d.supplyDate != "" and not dateValid(d.supplyDate)) return ?"Invalid supply date";
    if (d.dueDate != "" and (not dateValid(d.dueDate) or Text.compare(d.dueDate, d.issueDate) == #less)) return ?"Due date must be on or after issue date";
    if (d.lines.size() > 100) return ?"At most 100 line items are supported";
    var labourGross = 0;
    for (line in d.lines.values()) {
      if (line.description.trim(#char ' ') == "" or line.description.size() > 1000) return ?"Each line needs a description (max 1000 characters)";
      if (line.quantityMilli == 0 or line.quantityMilli > 1_000_000_000 or line.unitOre > 100_000_000_000 or line.discountBps > 10_000) return ?"Invalid line quantity, price or discount";
      if (not member(line.category, ["labour", "material", "other"])) return ?"Invalid cost category";
      if (not member(line.treatment, ["standard", "reverse", "exempt"])) return ?"Invalid VAT treatment";
      if (line.treatment == "standard" and not member(line.vatBps.toText(), ["600", "1200", "2500"])) return ?"Supported standard VAT rates are 6, 12 and 25 percent; other cases require accountant review";
      if (line.treatment != "standard" and line.vatBps != 0) return ?"Reverse-charge/exempt lines cannot charge VAT";
      if (line.exemptionReason.size() > 500) return ?"Exemption reason is too long";
      if (line.treatment == "exempt" and line.exemptionReason.trim(#char ' ') == "") return ?"VAT exemption requires a reason";
      if (line.treatment == "reverse" and (d.customerType == "private" or d.customerVat == "" or not d.reverseChargeConfirmed)) return ?"Reverse charge requires business buyer VAT number and eligibility confirmation";
      if (line.category == "labour") labourGross += lineNet(line) + lineVat(line);
    };
    if (totals(d).grossOre > 100_000_000_000_000) return ?"Document total exceeds the supported limit";
    if (d.rotOre > 0) {
      if (d.kind != "rot" or d.customerType != "private" or not d.rotConfirmed or not s.brand.fTax) return ?"ROT requires private customer, F-tax and an eligibility review";
      if (not d.issueDate.startsWith(#text "2026-")) return ?"ROT rules for this year require an accountant-approved update";
      if (d.rotOre > (labourGross * 30 / 100) or d.rotOre > 5_000_000) return ?"ROT exceeds 30 percent of labour or the supported single-customer SEK 50,000 limit";
      for (line in d.lines.values()) {
        if (line.treatment != "standard" or line.vatBps != 2500) return ?"ROT currently supports Swedish 25 percent VAT only";
      };
    };
    if (issuing and isInvoice(d.kind)) {
      if (d.customerAddress == "" or d.lines.size() == 0 or d.supplyDate == "" or d.dueDate == "") return ?"Invoices require buyer address, lines, supply/advance date and due date";
      if (s.vatRegistered == "unknown") return ?"Confirm VAT registration before issuing";
      if (s.vatRegistered == "yes" and s.brand.vatNumber == "") return ?"Seller VAT number is required";
      if (s.brand.paymentDetails == "") return ?"Configure payment details before issuing";
      for (line in d.lines.values()) {
        if (s.vatRegistered == "no" and line.treatment != "exempt") return ?"A non-VAT-registered seller must use reviewed VAT-exempt lines";
      };
      if (d.kind == "credit" and d.sourceId == null) return ?"Credit invoice requires an original invoice";
    };
    null;
  };
};
