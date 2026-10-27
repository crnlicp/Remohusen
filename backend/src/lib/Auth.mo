import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Char "mo:core/Char";
import List "mo:core/List";
import Sha256 "mo:sha2/Sha256";
import Types "../types";

module {
  let second : Int = 1_000_000_000;
  // Durations in nanoseconds.
  public let sessionTtl : Int = 28_800_000_000_000; // 8 hours
  public let maxFailures = 5;
  public let failureWindow : Int = 900_000_000_000; // 15 minutes
  public let lockDuration : Int = 300_000_000_000; // 5 minutes
  public let maxSessions = 20;
  let hashRounds = 2000;

  public func hashPassword(salt : Blob, password : Text) : Blob {
    let d = Sha256.new();
    d.writeBlob(salt);
    d.writeBlob(password.encodeUtf8());
    var h = d.sum();
    for (_ in Nat.range(0, hashRounds)) {
      let r = Sha256.new();
      r.writeBlob(h);
      r.writeBlob(salt);
      h := r.sum();
    };
    h;
  };

  public func toHex(bytes : Blob) : Text {
    let digits = "0123456789abcdef".toArray();
    var out = "";
    for (b in bytes.values()) {
      let n = b.toNat();
      out #= digits[n / 16].toText() # digits[n % 16].toText();
    };
    out;
  };

  public func validateUsername(username : Text) : ?Text {
    let size = username.size();
    if (size < 3 or size > 64) { return ?"Username must be 3–64 characters" };
    null;
  };

  public func validatePassword(password : Text) : ?Text {
    let size = password.size();
    if (size < 8 or size > 128) { return ?"Password must be 8–128 characters" };
    null;
  };

  public func credentials(username : Text, password : Text, salt : Blob) : Types.AdminCredentials {
    { username; salt; passwordHash = hashPassword(salt, password) };
  };

  public func verify(self : Types.AuthState, username : Text, password : Text) : Bool {
    switch (self.admin) {
      case null false;
      case (?admin) {
        admin.username == username and hashPassword(admin.salt, password) == admin.passwordHash;
      };
    };
  };

  /// Returns an error message if logins are currently locked.
  public func lockError(self : Types.AuthState, now : Int) : ?Text {
    if (now < self.lockedUntil) {
      let secondsLeft = (self.lockedUntil - now) / second;
      ?("Too many failed attempts. Try again in " # Int.toText(secondsLeft + 1) # " seconds");
    } else { null };
  };

  public func recordFailure(self : Types.AuthState, now : Int) {
    if (now - self.windowStart > failureWindow) {
      self.windowStart := now;
      self.failedAttempts := 0;
    };
    self.failedAttempts += 1;
    if (self.failedAttempts >= maxFailures) {
      self.lockedUntil := now + lockDuration;
      self.failedAttempts := 0;
      self.windowStart := now;
    };
  };

  public func resetFailures(self : Types.AuthState) {
    self.failedAttempts := 0;
  };

  public func pruneSessions(self : Types.AuthState, now : Int) {
    let expired = List.empty<Text>();
    for ((k, s) in self.sessions.entries()) {
      if (s.expiresAt <= now) { expired.add(k) };
    };
    for (k in expired.values()) { self.sessions.remove(k) };
    // Keep the number of concurrent sessions bounded: drop the ones expiring soonest.
    while (self.sessions.size() >= maxSessions) {
      var oldestKey : ?Text = null;
      var oldestExp : Int = 0;
      for ((k, s) in self.sessions.entries()) {
        switch (oldestKey) {
          case null { oldestKey := ?k; oldestExp := s.expiresAt };
          case (?_) {
            if (s.expiresAt < oldestExp) { oldestKey := ?k; oldestExp := s.expiresAt };
          };
        };
      };
      switch (oldestKey) {
        case (?k) self.sessions.remove(k);
        case null {};
      };
    };
  };

  /// Returns the username for a valid, unexpired session token.
  public func sessionUser(self : Types.AuthState, token : Text, now : Int) : ?Text {
    if (token.size() != 64) { return null };
    switch (self.sessions.get(token)) {
      case (?s) { if (s.expiresAt > now) { ?s.username } else { null } };
      case null null;
    };
  };

  public func revokeAll(self : Types.AuthState) {
    self.sessions.clear();
  };

  public let unauthorized = "Unauthorized: please log in again";

  public func isAuthorized(self : Types.AuthState, token : Text, now : Int) : Bool {
    switch (sessionUser(self, token, now)) {
      case (?_) true;
      case null false;
    };
  };
};
