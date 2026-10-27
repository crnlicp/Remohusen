import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Types "../types";
import AuthLib "../lib/Auth";
import MessagesLib "../lib/Messages";

mixin (
  auth : Types.AuthState,
  content : Types.ContentState,
  imageState : Types.ImageState,
  messageState : Types.MessageState,
) {
  public query func adminDashboard(token : Text) : async Result.Result<Types.DashboardStats, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    #ok {
      slides = content.slides.size();
      services = content.services.size();
      projects = content.projects.size();
      testimonials = content.testimonials.size();
      news = content.news.size();
      publishedNews = content.news.values().filter(func p = p.published).size();
      images = imageState.images.size();
      messages = messageState.messages.size();
      unreadMessages = messageState.unreadCount();
    };
  };
};
