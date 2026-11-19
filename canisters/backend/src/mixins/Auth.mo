import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Random "mo:core/Random";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Types "../types";
import AuthLib "../lib/Auth";

mixin (auth : Types.AuthState) {
  public query func isAdminConfigured() : async Bool {
    auth.admin != null;
  };

  /// One-time setup of the admin account. Only a canister controller may call this,
  /// and only while no admin exists yet.
  public shared ({ caller }) func bootstrapAdmin(username : Text, password : Text) : async Result.Result<(), Text> {
    if (not caller.isController()) { return #err "Only a controller can bootstrap the admin" };
    if (auth.admin != null) { return #err "Admin already configured" };
    switch (AuthLib.validateUsername(username), AuthLib.validatePassword(password)) {
      case (?e, _) { return #err e };
      case (_, ?e) { return #err e };
      case (null, null) {};
    };
    let salt = await Random.blob();
    if (auth.admin != null) { return #err "Admin already configured" };
    auth.admin := ?AuthLib.credentials(username, password, salt);
    #ok(());
  };

  /// Recovery: a controller can always reset the admin credentials. Revokes all sessions.
  public shared ({ caller }) func resetAdminCredentials(username : Text, password : Text) : async Result.Result<(), Text> {
    if (not caller.isController()) { return #err "Only a controller can reset the admin" };
    switch (AuthLib.validateUsername(username), AuthLib.validatePassword(password)) {
      case (?e, _) { return #err e };
      case (_, ?e) { return #err e };
      case (null, null) {};
    };
    let salt = await Random.blob();
    auth.admin := ?AuthLib.credentials(username, password, salt);
    auth.revokeAll();
    auth.lockedUntil := 0;
    auth.resetFailures();
    #ok(());
  };

  public shared func login(username : Text, password : Text) : async Result.Result<Text, Text> {
    if (username.size() > 64 or password.size() > 128) { return #err "Invalid username or password" };
    let now = Time.now();
    switch (auth.lockError(now)) {
      case (?e) { return #err e };
      case null {};
    };
    if (not auth.verify(username, password)) {
      auth.recordFailure(now);
      return #err "Invalid username or password";
    };
    auth.resetFailures();
    let token = AuthLib.toHex(await Random.blob());
    let issuedAt = Time.now();
    auth.pruneSessions(issuedAt);
    auth.sessions.add(token, { username; expiresAt = issuedAt + AuthLib.sessionTtl });
    #ok token;
  };

  public shared func logout(token : Text) : async () {
    auth.sessions.remove(token);
  };

  public query func sessionInfo(token : Text) : async ?Types.Session {
    let now = Time.now();
    switch (auth.sessionUser(token, now)) {
      case null null;
      case (?_) auth.sessions.get(token);
    };
  };

  public shared func changePassword(token : Text, currentPassword : Text, newPassword : Text) : async Result.Result<(), Text> {
    let username = switch (auth.sessionUser(token, Time.now())) {
      case (?u) u;
      case null { return #err(AuthLib.unauthorized) };
    };
    if (not auth.verify(username, currentPassword)) {
      return #err "Current password is incorrect";
    };
    switch (AuthLib.validatePassword(newPassword)) {
      case (?e) { return #err e };
      case null {};
    };
    let salt = await Random.blob();
    auth.admin := ?AuthLib.credentials(username, newPassword, salt);
    // Keep only the current session.
    let current = auth.sessions.get(token);
    auth.revokeAll();
    switch (current) {
      case (?s) auth.sessions.add(token, s);
      case null {};
    };
    #ok(());
  };
};
