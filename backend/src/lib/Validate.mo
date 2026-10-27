import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Types "../types";

module {
  public let maxUrlLength = 2048;

  public func textMax(value : Text, max : Nat, field : Text) : ?Text {
    if (value.size() > max) { ?(field # " is too long (max " # max.toText() # " characters)") } else {
      null;
    };
  };

  public func textRequired(value : Text, max : Nat, field : Text) : ?Text {
    if (value.trim(#char ' ').size() == 0) { return ?(field # " is required") };
    textMax(value, max, field);
  };

  public func l10nMax(value : Types.L10n, max : Nat, field : Text) : ?Text {
    switch (textMax(value.sv, max, field # " (sv)")) {
      case (?e) ?e;
      case null textMax(value.en, max, field # " (en)");
    };
  };

  public func l10nRequired(value : Types.L10n, max : Nat, field : Text) : ?Text {
    switch (textRequired(value.sv, max, field # " (sv)")) {
      case (?e) ?e;
      case null textMax(value.en, max, field # " (en)");
    };
  };

  /// Accepts https URLs (and http only for localhost during development).
  public func isValidImageUrl(url : Text) : Bool {
    if (url.size() == 0 or url.size() > maxUrlLength) { return false };
    for (c in url.toIter()) {
      if (c.isWhitespace() or c.toNat32() < 32 or c == '\"' or c == '<' or c == '>') {
        return false;
      };
    };
    if (url.startsWith(#text "https://")) { return url.size() > 8 };
    url.startsWith(#text "http://localhost") or url.startsWith(#text "http://127.0.0.1");
  };

  public func imageRef(ref : Types.ImageRef, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    switch (ref) {
      case (#url u) {
        if (isValidImageUrl(u)) { null } else {
          ?"Image URL must be a valid https:// address";
        };
      };
      case (#stored id) {
        if (images.containsKey(id)) { null } else {
          ?("Uploaded image #" # id.toText() # " does not exist");
        };
      };
    };
  };

  public func optImageRef(ref : ?Types.ImageRef, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    switch (ref) {
      case null null;
      case (?r) imageRef(r, images);
    };
  };

  public func imageRefs(refs : [Types.ImageRef], images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    if (refs.size() > 30) { return ?"Too many images (max 30)" };
    for (r in refs.values()) {
      switch (imageRef(r, images)) {
        case (?e) { return ?e };
        case null {};
      };
    };
    null;
  };

  /// Search-engine verification tokens: short and limited to URL-safe characters.
  public func verificationCode(value : Text, field : Text) : ?Text {
    if (value.size() > 200) { return ?(field # " is too long") };
    for (c in value.toIter()) {
      if (not (c.isAlphabetic() or c.isDigit() or c == '-' or c == '_' or c == '=' or c == '.')) {
        return ?(field # " contains invalid characters");
      };
    };
    null;
  };

  /// Returns the first error in the list, if any.
  public func first(checks : [?Text]) : ?Text {
    for (c in checks.values()) {
      switch (c) {
        case (?e) { return ?e };
        case null {};
      };
    };
    null;
  };
};
