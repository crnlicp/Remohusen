import Docs "../src/lib/Documents";
import Types "../src/types";

let brand : Types.DocumentBrand = {
  legalName = "Synthetic Test KB"; orgNumber = "556000-0000"; address = "Testgatan 1";
  contact = ""; vatNumber = "SE556000000001"; fTax = true; paymentDetails = "Synthetic bank";
  header = { sv = ""; en = "" }; footer = { sv = ""; en = "" }; logoData = "";
};
let settings : Types.DocumentSettings = {
  brand; invoicePrefix = "TEST-"; paymentDays = 30; financialYearEnd = "2026-12-31";
  vatRegistered = "yes"; employees = "unknown"; partnerType = "individuals";
  accountingMethod = "invoice"; vatPeriod = "quarter"; archiveService = "Test"; privacyApproved = true;
};
let line : Types.DocumentLine = {
  description = "Test work"; quantityMilli = 1500; unitOre = 10001; discountBps = 1000;
  vatBps = 2500; category = "labour"; treatment = "standard"; exemptionReason = "";
};
let input : Types.DocumentInput = {
  kind = "invoice"; language = "sv"; title = "Test"; customerName = "Synthetic customer";
  customerAddress = "Test street"; customerVat = ""; customerType = "private"; project = "";
  issueDate = "2026-10-30"; supplyDate = "2026-10-30"; dueDate = "2026-11-30";
  terms = ""; notes = ""; internalNotes = ""; lines = [line]; sourceId = null;
  reverseChargeConfirmed = false; rotOre = 0; rotConfirmed = false;
};
assert Docs.lineNet(line) == 13501;
assert Docs.lineVat(line) == 3375;
assert Docs.totals(input).grossOre == 16876;
assert Docs.validateInput(input, settings, true) == null;
assert Docs.dateValid("2024-02-29");
assert not Docs.dateValid("2026-02-29");
assert not Docs.dateValid("2026-13-01");
assert not Docs.dateValid("2026-04-31");
assert Docs.shareActive(100, 99);
assert not Docs.shareActive(100, 100);
assert not Docs.shareActive(100, 101);
assert Docs.validateInput({ input with lines = [{ line with treatment = "reverse"; vatBps = 0 }] }, settings, true) != null;
assert Docs.validateInput({ input with customerType = "business"; customerVat = "SE123"; reverseChargeConfirmed = true; lines = [{ line with treatment = "reverse"; vatBps = 0 }] }, settings, true) == null;
assert Docs.validateInput({ input with lines = [{ line with treatment = "exempt"; vatBps = 0 }] }, settings, true) != null;
assert Docs.validateInput({ input with kind = "rot"; rotOre = 5062; rotConfirmed = true }, settings, true) == null;
assert Docs.validateInput({ input with kind = "rot"; rotOre = 5063; rotConfirmed = true }, settings, true) != null;
assert Docs.validateInput({ input with kind = "rot"; rotOre = 5000; rotConfirmed = true; issueDate = "2027-01-01" }, settings, true) != null;
assert Docs.validateInput(input, { settings with vatRegistered = "unknown" }, true) != null;
assert Docs.validateInput({ input with lines = [{ line with discountBps = 10001 }] }, settings, false) != null;
