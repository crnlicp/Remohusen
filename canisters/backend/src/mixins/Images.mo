import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Types "../types";
import AuthLib "../lib/Auth";
import ImagesLib "../lib/Images";

mixin (auth : Types.AuthState, imageState : Types.ImageState) {
  public query func getImageInfo(id : Nat) : async ?Types.ImageInfo {
    switch (imageState.images.get(id)) {
      case (?img) ?img.toInfo();
      case null null;
    };
  };

  public query func getImageChunk(id : Nat, index : Nat) : async ?Blob {
    switch (imageState.images.get(id)) {
      case (?img) { if (index < img.chunks.size()) ?img.chunks[index] else null };
      case null null;
    };
  };

  public shared func adminBeginUpload(token : Text, name : Text, mime : Text, size : Nat) : async Result.Result<Nat, Text> {
    let now = Time.now();
    if (not auth.isAuthorized(token, now)) { return #err(AuthLib.unauthorized) };
    imageState.begin(name, mime, size, now);
  };

  public shared func adminUploadChunk(token : Text, uploadId : Nat, index : Nat, data : Blob) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    imageState.addChunk(uploadId, index, data);
  };

  public shared func adminFinishUpload(token : Text, uploadId : Nat) : async Result.Result<Types.ImageInfo, Text> {
    let now = Time.now();
    if (not auth.isAuthorized(token, now)) { return #err(AuthLib.unauthorized) };
    imageState.finish(uploadId, now);
  };

  public query func adminListImages(token : Text) : async Result.Result<[Types.ImageInfo], Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    #ok(imageState.list());
  };

  public shared func adminDeleteImage(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    if (not imageState.images.containsKey(id)) { return #err "Image not found" };
    imageState.images.remove(id);
    #ok(());
  };
};
