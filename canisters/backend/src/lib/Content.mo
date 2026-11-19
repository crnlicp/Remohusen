import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Types "../types";
import V "Validate";

module {
  public func sortByOrder<T <: { id : Nat; order : Nat }>(items : [T]) : [T] {
    items.sort(
      func(a, b) = switch (Nat.compare(a.order, b.order)) {
        case (#equal) Nat.compare(a.id, b.id);
        case other other;
      }
    );
  };

  public func values<T>(m : Map.Map<Nat, T>) : [T] {
    m.values().toArray();
  };

  public func nextId(self : Types.ContentState) : Nat {
    let id = self.nextId;
    self.nextId += 1;
    id;
  };

  /// Newest first by publish date (falls back to creation date for drafts).
  public func sortNews(posts : [Types.NewsPost]) : [Types.NewsPost] {
    posts.sort(
      func(a, b) = Int.compare(
        if (b.published) b.publishedAt else b.createdAt,
        if (a.published) a.publishedAt else a.createdAt,
      )
    );
  };

  public func publishedNews(self : Types.ContentState) : [Types.NewsPost] {
    sortNews(self.news.values().filter(func p = p.published).toArray());
  };

  // ---------- Validation ----------

  public func validateSettings(s : Types.Settings) : ?Text {
    V.first([
      V.textRequired(s.companyName, 100, "Company name"),
      V.l10nMax(s.tagline, 300, "Tagline"),
      V.l10nMax(s.footerText, 1000, "Footer text"),
      V.textMax(s.orgNumber, 50, "Org number"),
      V.l10nMax(s.rotNotice, 500, "ROT notice"),
      V.textMax(s.socials.facebook, 500, "Facebook"),
      V.textMax(s.socials.instagram, 500, "Instagram"),
      V.textMax(s.socials.linkedin, 500, "LinkedIn"),
    ]);
  };

  public let seoBusinessTypes : [Text] = [
    "GeneralContractor",
    "HomeAndConstructionBusiness",
    "RoofingContractor",
    "Electrician",
    "Plumber",
    "HousePainter",
    "HVACBusiness",
    "LocalBusiness",
  ];

  func pageMeta(m : Types.PageMeta, field : Text) : ?Text {
    V.first([
      V.l10nMax(m.title, 120, field # " title"),
      V.l10nMax(m.description, 320, field # " description"),
    ]);
  };

  public func validateSeo(s : Types.SeoSettings) : ?Text {
    V.first([
      if (s.siteUrl == "" or V.isValidImageUrl(s.siteUrl)) null else ?"Website address must start with https://",
      pageMeta(s.home, "Home page"),
      pageMeta(s.about, "About page"),
      pageMeta(s.news, "News page"),
      pageMeta(s.contact, "Contact page"),
      V.l10nMax(s.keywords, 500, "Keywords"),
      if (s.ogImage == "" or V.isValidImageUrl(s.ogImage)) null else ?"Share image must be a valid https:// image URL",
      V.verificationCode(s.googleVerification, "Google verification code"),
      V.verificationCode(s.bingVerification, "Bing verification code"),
      if (seoBusinessTypes.find(func t = t == s.businessType) != null) null else ?"Unknown business type",
      V.textMax(s.areaServed, 300, "Area served"),
      V.textMax(s.priceRange, 20, "Price range"),
    ]);
  };

  public func validateSlide(s : Types.Slide, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    V.first([
      V.imageRef(s.image, images),
      V.l10nRequired(s.title, 200, "Title"),
      V.l10nMax(s.subtitle, 500, "Subtitle"),
      V.l10nMax(s.ctaText, 60, "Button text"),
      V.textMax(s.ctaLink, 500, "Button link"),
    ]);
  };

  public func validateService(s : Types.Service, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    V.first([
      V.textMax(s.icon, 50, "Icon"),
      V.l10nRequired(s.title, 200, "Title"),
      V.l10nMax(s.description, 2000, "Description"),
      V.optImageRef(s.image, images),
    ]);
  };

  public func validateProject(p : Types.Project, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    V.first([
      V.l10nRequired(p.title, 200, "Title"),
      V.l10nMax(p.description, 5000, "Description"),
      V.l10nMax(p.category, 100, "Category"),
      V.textMax(p.location, 200, "Location"),
      V.textMax(p.year, 20, "Year"),
      V.imageRefs(p.images, images),
    ]);
  };

  public func validateTestimonial(t : Types.Testimonial, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    if (t.rating < 1 or t.rating > 5) { return ?"Rating must be 1–5" };
    V.first([
      V.textRequired(t.name, 100, "Name"),
      V.l10nMax(t.role, 200, "Role"),
      V.l10nRequired(t.quote, 2000, "Quote"),
      V.optImageRef(t.avatar, images),
    ]);
  };

  public func validateNews(n : Types.NewsPost, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    V.first([
      V.l10nRequired(n.title, 300, "Title"),
      V.l10nMax(n.excerpt, 1000, "Excerpt"),
      V.l10nMax(n.body, 50_000, "Body"),
      V.optImageRef(n.cover, images),
    ]);
  };

  public func validateAbout(a : Types.AboutPage, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    if (a.values.size() > 20 or a.stats.size() > 12 or a.team.size() > 50) {
      return ?"Too many items in About page";
    };
    switch (
      V.first([
        V.l10nMax(a.heroTitle, 200, "Hero title"),
        V.l10nMax(a.heroText, 2000, "Hero text"),
        V.optImageRef(a.heroImage, images),
        V.l10nMax(a.storyTitle, 200, "Story title"),
        V.l10nMax(a.storyText, 20_000, "Story text"),
        V.optImageRef(a.storyImage, images),
      ])
    ) {
      case (?e) { return ?e };
      case null {};
    };
    for (v in a.values.values()) {
      switch (V.first([V.textMax(v.icon, 50, "Value icon"), V.l10nMax(v.title, 200, "Value title"), V.l10nMax(v.text, 2000, "Value text")])) {
        case (?e) { return ?e };
        case null {};
      };
    };
    for (s in a.stats.values()) {
      switch (V.first([V.textMax(s.value, 30, "Stat value"), V.l10nMax(s.caption, 100, "Stat caption")])) {
        case (?e) { return ?e };
        case null {};
      };
    };
    for (m in a.team.values()) {
      switch (V.first([V.textRequired(m.name, 100, "Team member name"), V.l10nMax(m.role, 200, "Team member role"), V.optImageRef(m.photo, images)])) {
        case (?e) { return ?e };
        case null {};
      };
    };
    null;
  };

  public func validateContact(c : Types.ContactInfo, images : Map.Map<Nat, Types.StoredImage>) : ?Text {
    V.first([
      V.l10nMax(c.title, 200, "Title"),
      V.l10nMax(c.intro, 2000, "Intro"),
      V.textMax(c.phone, 50, "Phone"),
      V.textMax(c.email, 200, "Email"),
      V.textMax(c.address, 200, "Address"),
      V.textMax(c.postalCode, 20, "Postal code"),
      V.textMax(c.city, 100, "City"),
      V.l10nMax(c.openingHours, 500, "Opening hours"),
      V.textMax(c.mapLat, 30, "Latitude"),
      V.textMax(c.mapLng, 30, "Longitude"),
      V.optImageRef(c.heroImage, images),
    ]);
  };
};
