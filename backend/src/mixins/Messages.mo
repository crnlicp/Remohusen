import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Types "../types";
import AuthLib "../lib/Auth";
import MessagesLib "../lib/Messages";

mixin (auth : Types.AuthState, messageState : Types.MessageState) {
  public shared func submitMessage(input : Types.MessageInput) : async Result.Result<Nat, Text> {
    messageState.submit(input, Time.now());
  };

  public query func adminListMessages(token : Text) : async Result.Result<[Types.Message], Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    #ok(messageState.listNewestFirst());
  };

  public shared func adminSetMessageRead(token : Text, id : Nat, read : Bool) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (messageState.messages.get(id)) {
      case (?m) { messageState.messages.add(id, { m with read }) };
      case null { return #err "Message not found" };
    };
    #ok(());
  };

  public shared func adminDeleteMessage(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    messageState.messages.remove(id);
    #ok(());
  };
};
