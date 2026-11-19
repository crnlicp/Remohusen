import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Types "../types";
import AuthLib "../lib/Auth";
import ContentLib "../lib/Content";

mixin (auth : Types.AuthState, content : Types.ContentState, imageState : Types.ImageState, seoState : Types.SeoState) {
  // ---------- Public reads ----------

  public query func getSiteContent() : async Types.SiteContent {
    let news = content.publishedNews();
    {
      settings = content.settings;
      seo = seoState.seo;
      slides = ContentLib.sortByOrder(ContentLib.values(content.slides).filter(func s = s.active));
      services = ContentLib.sortByOrder(ContentLib.values(content.services).filter(func s = s.active));
      projects = ContentLib.sortByOrder(ContentLib.values(content.projects));
      testimonials = ContentLib.sortByOrder(ContentLib.values(content.testimonials).filter(func t = t.active));
      latestNews = news.sliceToArray(0, 3);
      about = content.about;
      contact = content.contact;
    };
  };

  public query func listNews() : async [Types.NewsPost] {
    content.publishedNews();
  };

  public query func getNewsPost(id : Nat) : async ?Types.NewsPost {
    switch (content.news.get(id)) {
      case (?p) { if (p.published) ?p else null };
      case null null;
    };
  };

  // ---------- Admin ----------

  public query func adminGetContent(token : Text) : async Result.Result<Types.AdminContent, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    #ok {
      settings = content.settings;
      seo = seoState.seo;
      slides = ContentLib.sortByOrder(ContentLib.values(content.slides));
      services = ContentLib.sortByOrder(ContentLib.values(content.services));
      projects = ContentLib.sortByOrder(ContentLib.values(content.projects));
      testimonials = ContentLib.sortByOrder(ContentLib.values(content.testimonials));
      news = ContentLib.sortNews(ContentLib.values(content.news));
      about = content.about;
      contact = content.contact;
    };
  };

  public shared func adminSaveSettings(token : Text, settings : Types.Settings) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateSettings(settings)) {
      case (?e) { return #err e };
      case null {};
    };
    content.settings := settings;
    #ok(());
  };

  public shared func adminSaveSeo(token : Text, seo : Types.SeoSettings) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateSeo(seo)) {
      case (?e) { return #err e };
      case null {};
    };
    seoState.seo := seo;
    #ok(());
  };

  public shared func adminSaveAbout(token : Text, about : Types.AboutPage) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateAbout(about, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    content.about := about;
    #ok(());
  };

  public shared func adminSaveContact(token : Text, contact : Types.ContactInfo) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateContact(contact, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    content.contact := contact;
    #ok(());
  };

  /// Create (id = 0) or update a hero slide.
  public shared func adminSaveSlide(token : Text, slide : Types.Slide) : async Result.Result<Nat, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateSlide(slide, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    if (slide.id != 0 and not content.slides.containsKey(slide.id)) { return #err "Slide not found" };
    let id = if (slide.id == 0) content.nextId() else slide.id;
    content.slides.add(id, { slide with id });
    #ok id;
  };

  public shared func adminDeleteSlide(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    content.slides.remove(id);
    #ok(());
  };

  public shared func adminSaveService(token : Text, service : Types.Service) : async Result.Result<Nat, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateService(service, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    if (service.id != 0 and not content.services.containsKey(service.id)) { return #err "Service not found" };
    let id = if (service.id == 0) content.nextId() else service.id;
    content.services.add(id, { service with id });
    #ok id;
  };

  public shared func adminDeleteService(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    content.services.remove(id);
    #ok(());
  };

  public shared func adminSaveProject(token : Text, project : Types.Project) : async Result.Result<Nat, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateProject(project, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    if (project.id != 0 and not content.projects.containsKey(project.id)) { return #err "Project not found" };
    let id = if (project.id == 0) content.nextId() else project.id;
    content.projects.add(id, { project with id });
    #ok id;
  };

  public shared func adminDeleteProject(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    content.projects.remove(id);
    #ok(());
  };

  public shared func adminSaveTestimonial(token : Text, testimonial : Types.Testimonial) : async Result.Result<Nat, Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateTestimonial(testimonial, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    if (testimonial.id != 0 and not content.testimonials.containsKey(testimonial.id)) {
      return #err "Testimonial not found";
    };
    let id = if (testimonial.id == 0) content.nextId() else testimonial.id;
    content.testimonials.add(id, { testimonial with id });
    #ok id;
  };

  public shared func adminDeleteTestimonial(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    content.testimonials.remove(id);
    #ok(());
  };

  /// Create (id = 0) or update a news post. Timestamps are managed by the canister.
  public shared func adminSaveNews(token : Text, post : Types.NewsPost) : async Result.Result<Nat, Text> {
    let now = Time.now();
    if (not auth.isAuthorized(token, now)) { return #err(AuthLib.unauthorized) };
    switch (ContentLib.validateNews(post, imageState.images)) {
      case (?e) { return #err e };
      case null {};
    };
    if (post.id == 0) {
      let id = content.nextId();
      content.news.add(
        id,
        {
          post with id;
          createdAt = now;
          updatedAt = now;
          publishedAt = if (post.published) now else 0;
        },
      );
      return #ok id;
    };
    let existing = switch (content.news.get(post.id)) {
      case (?p) p;
      case null { return #err "News post not found" };
    };
    let publishedAt = if (post.published and existing.publishedAt == 0) now else existing.publishedAt;
    content.news.add(
      post.id,
      {
        post with createdAt = existing.createdAt;
        updatedAt = now;
        publishedAt;
      },
    );
    #ok(post.id);
  };

  public shared func adminDeleteNews(token : Text, id : Nat) : async Result.Result<(), Text> {
    if (not auth.isAuthorized(token, Time.now())) { return #err(AuthLib.unauthorized) };
    content.news.remove(id);
    #ok(());
  };
};
