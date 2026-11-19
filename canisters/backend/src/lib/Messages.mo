import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Result "mo:core/Result";
import Array "mo:core/Array";
import Types "../types";
import V "Validate";

module {
  public let maxMessages = 5_000;
  let rateWindow : Int = 600_000_000_000; // 10 minutes
  let maxPerWindow = 30;

  func isPlausibleEmail(email : Text) : Bool {
    let parts = email.split(#char '@').toArray();
    parts.size() == 2 and parts[0].size() > 0 and parts[1].contains(#char '.') and not email.contains(#char ' ');
  };

  public func submit(self : Types.MessageState, input : Types.MessageInput, now : Int) : Result.Result<Nat, Text> {
    switch (
      V.first([
        V.textRequired(input.name, 100, "Name"),
        V.textRequired(input.email, 200, "Email"),
        V.textMax(input.phone, 50, "Phone"),
        V.textMax(input.subject, 200, "Subject"),
        V.textRequired(input.body, 5_000, "Message"),
      ])
    ) {
      case (?e) { return #err e };
      case null {};
    };
    if (not isPlausibleEmail(input.email)) { return #err "Invalid email address" };
    if (self.messages.size() >= maxMessages) {
      return #err "Message inbox is full, please call or email us instead";
    };
    if (now - self.windowStart > rateWindow) {
      self.windowStart := now;
      self.windowCount := 0;
    };
    if (self.windowCount >= maxPerWindow) {
      return #err "Too many messages right now, please try again in a few minutes";
    };
    self.windowCount += 1;
    let id = self.nextId;
    self.nextId += 1;
    self.messages.add(id, { input with id; createdAt = now; read = false });
    #ok id;
  };

  public func listNewestFirst(self : Types.MessageState) : [Types.Message] {
    self.messages.reverseEntries().map(func((_, m)) = m).toArray();
  };

  public func unreadCount(self : Types.MessageState) : Nat {
    self.messages.values().filter(func m = not m.read).size();
  };
};
