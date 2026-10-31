import Map "mo:core/Map";
import Nat "mo:core/Nat";

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
  type Totals = { netOre : Nat; vatOre : Nat; grossOre : Nat; payableOre : Nat };
  type Event = { at : Int; action : Text; detail : Text };
  type Payment = { date : Text; amountOre : Nat; reference : Text };
  type Evidence = { archiveReference : Text; einvoiceReference : Text; acceptanceReference : Text };
  type Document = {
    id : Nat; revision : Nat; input : Input; brand : Brand; totals : Totals;
    number : Text; sourceNumber : Text; issuedAt : ?Int; createdAt : Int;
    pdfReady : Bool; pdfHash : Text; pdfChunks : Nat; shareHash : ?Text;
    payments : [Payment]; evidence : Evidence; events : [Event];
  };
  type StoredPdf = { chunks : [Blob]; size : Nat };
  type Share = { documentId : Nat; expiresAt : Int };
  type State = {
    var settings : ?Settings;
    records : Map.Map<Nat, Document>;
    files : Map.Map<Nat, StoredPdf>;
    shares : Map.Map<Text, Share>;
    var nextId : Nat;
    var nextNumber : Nat;
  };
  type OldActor = { documentState : State };
  type NewActor = { documentState : State };

  public func migration(old : OldActor) : NewActor {
    let previous = old.documentState;
    {
      documentState = {
        var settings = previous.settings;
        records = previous.records;
        files = Map.empty();
        shares = previous.shares;
        var nextId = previous.nextId;
        var nextNumber = previous.nextNumber;
      };
    };
  };
};
