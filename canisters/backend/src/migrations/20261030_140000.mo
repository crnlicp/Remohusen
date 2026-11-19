import Map "mo:core/Map";

module {
  type L10n = { sv : Text; en : Text };
  type Brand = {
    legalName : Text; orgNumber : Text; address : Text; contact : Text;
    vatNumber : Text; fTax : Bool; paymentDetails : Text;
    header : L10n; footer : L10n; logoData : Text;
  };
  type Settings = {
    brand : Brand; invoicePrefix : Text; paymentDays : Nat; financialYearEnd : Text;
    vatRegistered : Text; employees : Text; partnerType : Text; accountingMethod : Text;
    vatPeriod : Text; archiveService : Text; privacyApproved : Bool;
  };
  type Line = {
    description : Text; quantityMilli : Nat; unitOre : Nat; discountBps : Nat;
    vatBps : Nat; category : Text; treatment : Text; exemptionReason : Text;
  };
  type Input = {
    kind : Text; language : Text; title : Text;
    customerName : Text; customerAddress : Text; customerVat : Text; customerType : Text;
    project : Text; issueDate : Text; supplyDate : Text; dueDate : Text;
    terms : Text; notes : Text; internalNotes : Text; lines : [Line]; sourceId : ?Nat;
    reverseChargeConfirmed : Bool; rotOre : Nat; rotConfirmed : Bool;
  };
  type Document = {
    id : Nat; revision : Nat; input : Input; brand : Brand;
    totals : { netOre : Nat; vatOre : Nat; grossOre : Nat; payableOre : Nat };
    number : Text; sourceNumber : Text; issuedAt : ?Int; createdAt : Int;
    pdfReady : Bool; pdfHash : Text; pdfChunks : Nat; shareHash : ?Text;
    payments : [{ date : Text; amountOre : Nat; reference : Text }];
    evidence : { archiveReference : Text; einvoiceReference : Text; acceptanceReference : Text };
    events : [{ at : Int; action : Text; detail : Text }];
  };
  type State = {
    var settings : ?Settings;
    records : Map.Map<Nat, Document>;
    files : Map.Map<Nat, { chunks : [Blob]; size : Nat }>;
    shares : Map.Map<Text, { documentId : Nat; expiresAt : Int }>;
    var nextId : Nat; var nextNumber : Nat;
  };
  public func migration(_ : {}) : { documentState : State } {
    {
      documentState = {
        var settings = null;
        records = Map.empty();
        files = Map.empty();
        shares = Map.empty();
        var nextId = 1;
        var nextNumber = 1;
      };
    };
  };
};
