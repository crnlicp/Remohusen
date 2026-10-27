import Types "types";
import AuthMixin "mixins/Auth";
import ImagesMixin "mixins/Images";
import ContentMixin "mixins/Content";
import MessagesMixin "mixins/Messages";
import DashboardMixin "mixins/Dashboard";

actor {
  let auth : Types.AuthState;
  let content : Types.ContentState;
  let imageState : Types.ImageState;
  let messageState : Types.MessageState;
  let seoState : Types.SeoState;

  include AuthMixin(auth);
  include ImagesMixin(auth, imageState);
  include ContentMixin(auth, content, imageState, seoState);
  include MessagesMixin(auth, messageState);
  include DashboardMixin(auth, content, imageState, messageState);
};
