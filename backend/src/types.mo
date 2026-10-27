import Map "mo:core/Map";
import List "mo:core/List";

module {
  // ---------- Shared building blocks ----------

  /// Localized text: Swedish (default) and English.
  public type L10n = { sv : Text; en : Text };

  /// Any image in the site is either an uploaded image stored in this canister
  /// or an external URL that the frontend loads directly.
  public type ImageRef = { #stored : Nat; #url : Text };

  // ---------- Auth ----------

  public type AdminCredentials = {
    username : Text;
    salt : Blob;
    passwordHash : Blob;
  };

  public type Session = {
    username : Text;
    expiresAt : Int;
  };

  public type AuthState = {
    var admin : ?AdminCredentials;
    sessions : Map.Map<Text, Session>;
    var failedAttempts : Nat;
    var windowStart : Int;
    var lockedUntil : Int;
  };

  // ---------- Images ----------

  public type StoredImage = {
    id : Nat;
    name : Text;
    mime : Text;
    size : Nat;
    chunks : [Blob];
    createdAt : Int;
  };

  public type PendingUpload = {
    name : Text;
    mime : Text;
    size : Nat;
    chunks : List.List<Blob>;
    var received : Nat;
    startedAt : Int;
  };

  public type ImageState = {
    images : Map.Map<Nat, StoredImage>;
    uploads : Map.Map<Nat, PendingUpload>;
    var nextId : Nat;
  };

  /// Public metadata for an uploaded image (without data).
  public type ImageInfo = {
    id : Nat;
    name : Text;
    mime : Text;
    size : Nat;
    chunkCount : Nat;
    createdAt : Int;
  };

  // ---------- Content ----------

  public type SocialLinks = {
    facebook : Text;
    instagram : Text;
    linkedin : Text;
  };

  public type Settings = {
    companyName : Text;
    tagline : L10n;
    footerText : L10n;
    orgNumber : Text;
    rotNotice : L10n;
    socials : SocialLinks;
  };

  // ---------- SEO ----------

  public type PageMeta = { title : L10n; description : L10n };

  public type SeoSettings = {
    /// Primary public address, e.g. https://www.remohusen.se (used for canonical links). Empty = current origin.
    siteUrl : Text;
    home : PageMeta;
    about : PageMeta;
    news : PageMeta;
    contact : PageMeta;
    keywords : L10n;
    /// Absolute https URL of the default image shown when the site is shared on social media.
    ogImage : Text;
    allowIndexing : Bool;
    googleVerification : Text;
    bingVerification : Text;
    /// schema.org business type used in structured data, e.g. "GeneralContractor".
    businessType : Text;
    areaServed : Text;
    priceRange : Text;
  };

  public type SeoState = { var seo : SeoSettings };

  public type Slide = {
    id : Nat;
    image : ImageRef;
    title : L10n;
    subtitle : L10n;
    ctaText : L10n;
    ctaLink : Text;
    order : Nat;
    active : Bool;
  };

  public type Service = {
    id : Nat;
    icon : Text;
    title : L10n;
    description : L10n;
    image : ?ImageRef;
    order : Nat;
    active : Bool;
  };

  public type Project = {
    id : Nat;
    title : L10n;
    description : L10n;
    category : L10n;
    location : Text;
    year : Text;
    images : [ImageRef];
    featured : Bool;
    order : Nat;
  };

  public type Testimonial = {
    id : Nat;
    name : Text;
    role : L10n;
    quote : L10n;
    rating : Nat;
    avatar : ?ImageRef;
    order : Nat;
    active : Bool;
  };

  public type NewsPost = {
    id : Nat;
    title : L10n;
    excerpt : L10n;
    body : L10n;
    cover : ?ImageRef;
    published : Bool;
    createdAt : Int;
    updatedAt : Int;
    publishedAt : Int;
  };

  public type AboutValue = { icon : Text; title : L10n; text : L10n };
  public type AboutStat = { value : Text; caption : L10n };
  public type TeamMember = { name : Text; role : L10n; photo : ?ImageRef };

  public type AboutPage = {
    heroTitle : L10n;
    heroText : L10n;
    heroImage : ?ImageRef;
    storyTitle : L10n;
    storyText : L10n;
    storyImage : ?ImageRef;
    values : [AboutValue];
    stats : [AboutStat];
    team : [TeamMember];
  };

  public type ContactInfo = {
    title : L10n;
    intro : L10n;
    phone : Text;
    email : Text;
    address : Text;
    postalCode : Text;
    city : Text;
    openingHours : L10n;
    mapLat : Text;
    mapLng : Text;
    heroImage : ?ImageRef;
  };

  public type Message = {
    id : Nat;
    name : Text;
    email : Text;
    phone : Text;
    subject : Text;
    body : Text;
    createdAt : Int;
    read : Bool;
  };

  public type MessageInput = {
    name : Text;
    email : Text;
    phone : Text;
    subject : Text;
    body : Text;
  };

  public type ContentState = {
    var settings : Settings;
    var about : AboutPage;
    var contact : ContactInfo;
    slides : Map.Map<Nat, Slide>;
    services : Map.Map<Nat, Service>;
    projects : Map.Map<Nat, Project>;
    testimonials : Map.Map<Nat, Testimonial>;
    news : Map.Map<Nat, NewsPost>;
    var nextId : Nat;
  };

  public type MessageState = {
    messages : Map.Map<Nat, Message>;
    var nextId : Nat;
    var windowStart : Int;
    var windowCount : Nat;
  };

  /// Everything the public landing page needs in one call.
  public type SiteContent = {
    settings : Settings;
    seo : SeoSettings;
    slides : [Slide];
    services : [Service];
    projects : [Project];
    testimonials : [Testimonial];
    latestNews : [NewsPost];
    about : AboutPage;
    contact : ContactInfo;
  };

  /// All content including drafts/inactive items, for the admin panel.
  public type AdminContent = {
    settings : Settings;
    seo : SeoSettings;
    slides : [Slide];
    services : [Service];
    projects : [Project];
    testimonials : [Testimonial];
    news : [NewsPost];
    about : AboutPage;
    contact : ContactInfo;
  };

  public type DashboardStats = {
    slides : Nat;
    services : Nat;
    projects : Nat;
    testimonials : Nat;
    news : Nat;
    publishedNews : Nat;
    images : Nat;
    messages : Nat;
    unreadMessages : Nat;
  };
};
