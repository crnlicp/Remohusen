import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Text "mo:core/Text";
import Result "mo:core/Result";
import Types "../types";

module {
  public let maxImageSize = 10_000_000;
  public let maxChunkSize = 1_900_000;
  public let maxImages = 2_000;
  let uploadTtl : Int = 3_600_000_000_000;

  let allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

  public func toInfo(self : Types.StoredImage) : Types.ImageInfo {
    {
      id = self.id;
      name = self.name;
      mime = self.mime;
      size = self.size;
      chunkCount = self.chunks.size();
      createdAt = self.createdAt;
    };
  };

  public func pruneUploads(self : Types.ImageState, now : Int) {
    let stale = List.empty<Nat>();
    for ((id, u) in self.uploads.entries()) {
      if (now - u.startedAt > uploadTtl) { stale.add(id) };
    };
    for (id in stale.values()) { self.uploads.remove(id) };
  };

  public func begin(self : Types.ImageState, name : Text, mime : Text, size : Nat, now : Int) : Result.Result<Nat, Text> {
    if (not allowedMimes.contains(mime)) {
      return #err "Unsupported image type (use JPEG, PNG, WebP, GIF or AVIF)";
    };
    if (size == 0 or size > maxImageSize) {
      return #err ("Image must be between 1 byte and " # (maxImageSize / 1_000_000).toText() # " MB");
    };
    if (name.size() > 200) { return #err "File name is too long" };
    if (self.images.size() >= maxImages) { return #err "Image storage limit reached" };
    pruneUploads(self, now);
    if (self.uploads.size() >= 20) { return #err "Too many uploads in progress" };
    let id = self.nextId;
    self.nextId += 1;
    self.uploads.add(id, { name; mime; size; chunks = List.empty<Blob>(); var received = 0; startedAt = now });
    #ok id;
  };

  public func addChunk(self : Types.ImageState, uploadId : Nat, index : Nat, data : Blob) : Result.Result<(), Text> {
    let upload = switch (self.uploads.get(uploadId)) {
      case (?u) u;
      case null { return #err "Unknown or expired upload" };
    };
    if (index != upload.chunks.size()) {
      return #err ("Expected chunk " # upload.chunks.size().toText());
    };
    if (data.size() == 0 or data.size() > maxChunkSize) { return #err "Invalid chunk size" };
    if (upload.received + data.size() > upload.size) { return #err "Upload exceeds declared size" };
    upload.chunks.add(data);
    upload.received += data.size();
    #ok(());
  };

  public func finish(self : Types.ImageState, uploadId : Nat, now : Int) : Result.Result<Types.ImageInfo, Text> {
    let upload = switch (self.uploads.get(uploadId)) {
      case (?u) u;
      case null { return #err "Unknown or expired upload" };
    };
    if (upload.received != upload.size) {
      return #err "Upload incomplete";
    };
    let image : Types.StoredImage = {
      id = uploadId;
      name = upload.name;
      mime = upload.mime;
      size = upload.size;
      chunks = upload.chunks.toArray();
      createdAt = now;
    };
    self.uploads.remove(uploadId);
    self.images.add(uploadId, image);
    #ok(toInfo(image));
  };

  public func list(self : Types.ImageState) : [Types.ImageInfo] {
    self.images.reverseEntries().map(func((_, img)) = toInfo(img)).toArray();
  };
};
