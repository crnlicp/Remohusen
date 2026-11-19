import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";

module {
  type L10n = { sv : Text; en : Text };
  type ImageRef = { #stored : Nat; #url : Text };

  type AdminCredentials = { username : Text; salt : Blob; passwordHash : Blob };
  type Session = { username : Text; expiresAt : Int };
  type AuthState = {
    var admin : ?AdminCredentials;
    sessions : Map.Map<Text, Session>;
    var failedAttempts : Nat;
    var windowStart : Int;
    var lockedUntil : Int;
  };

  type StoredImage = { id : Nat; name : Text; mime : Text; size : Nat; chunks : [Blob]; createdAt : Int };
  type PendingUpload = {
    name : Text;
    mime : Text;
    size : Nat;
    chunks : List.List<Blob>;
    var received : Nat;
    startedAt : Int;
  };
  type ImageState = {
    images : Map.Map<Nat, StoredImage>;
    uploads : Map.Map<Nat, PendingUpload>;
    var nextId : Nat;
  };

  type SocialLinks = { facebook : Text; instagram : Text; linkedin : Text };
  type Settings = {
    companyName : Text;
    tagline : L10n;
    footerText : L10n;
    orgNumber : Text;
    rotNotice : L10n;
    socials : SocialLinks;
  };
  type Slide = {
    id : Nat;
    image : ImageRef;
    title : L10n;
    subtitle : L10n;
    ctaText : L10n;
    ctaLink : Text;
    order : Nat;
    active : Bool;
  };
  type Service = {
    id : Nat;
    icon : Text;
    title : L10n;
    description : L10n;
    image : ?ImageRef;
    order : Nat;
    active : Bool;
  };
  type Project = {
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
  type Testimonial = {
    id : Nat;
    name : Text;
    role : L10n;
    quote : L10n;
    rating : Nat;
    avatar : ?ImageRef;
    order : Nat;
    active : Bool;
  };
  type NewsPost = {
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
  type AboutValue = { icon : Text; title : L10n; text : L10n };
  type AboutStat = { value : Text; caption : L10n };
  type TeamMember = { name : Text; role : L10n; photo : ?ImageRef };
  type AboutPage = {
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
  type ContactInfo = {
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
  type Message = {
    id : Nat;
    name : Text;
    email : Text;
    phone : Text;
    subject : Text;
    body : Text;
    createdAt : Int;
    read : Bool;
  };
  type ContentState = {
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
  type MessageState = {
    messages : Map.Map<Nat, Message>;
    var nextId : Nat;
    var windowStart : Int;
    var windowCount : Nat;
  };

  type OldActor = {};
  type NewActor = {
    auth : AuthState;
    content : ContentState;
    imageState : ImageState;
    messageState : MessageState;
  };

  func t(sv : Text, en : Text) : L10n { { sv; en } };

  func img(photo : Text) : ImageRef {
    #url("https://images.unsplash.com/photo-" # photo # "?auto=format&fit=crop&w=1920&q=80");
  };

  func thumb(photo : Text) : ImageRef {
    #url("https://images.unsplash.com/photo-" # photo # "?auto=format&fit=crop&w=400&h=400&q=80");
  };

  // Fixed seed timestamp (2026-10-01T08:00:00Z) so the chain stays deterministic.
  let seedTime : Int = 1_790_841_600_000_000_000;
  let day : Int = 86_400_000_000_000;

  public func migration(_ : OldActor) : NewActor {
    let slides = Map.fromArray<Nat, Slide>([
      (1, {
        id = 1;
        image = img("1600585154340-be6161a56a0c");
        title = t("Vi bygger ditt drömhem", "We build your dream home");
        subtitle = t("Nybyggnation av villor och fritidshus – från ritning till inflyttning.", "New villas and holiday homes – from drawing board to move-in day.");
        ctaText = t("Begär offert", "Request a quote");
        ctaLink = "/kontakt";
        order = 1;
        active = true;
      }),
      (2, {
        id = 2;
        image = img("1556911220-bff31c812dba");
        title = t("Renovering med känsla", "Renovation with care");
        subtitle = t("Kök, badrum och hela hus – vi förnyar med kvalitet och omtanke.", "Kitchens, bathrooms and whole houses – renewed with quality and care.");
        ctaText = t("Våra tjänster", "Our services");
        ctaLink = "/#tjanster";
        order = 2;
        active = true;
      }),
      (3, {
        id = 3;
        image = img("1541888946425-d81bb19240f5");
        title = t("Trygghet i varje projekt", "Confidence in every project");
        subtitle = t("Fasta priser, tydliga tidsplaner och ROT-avdrag direkt på fakturan.", "Fixed prices, clear schedules and ROT tax deduction straight on the invoice.");
        ctaText = t("Om oss", "About us");
        ctaLink = "/om-oss";
        order = 3;
        active = true;
      }),
    ]);

    let services = Map.fromArray<Nat, Service>([
      (4, { id = 4; icon = "house"; title = t("Nybyggnation", "New construction"); description = t("Vi bygger villor, parhus och fritidshus i hela Mellansverige – nyckelfärdigt eller som stomme.", "We build villas, semi-detached and holiday homes across central Sweden – turnkey or shell only."); image = null; order = 1; active = true }),
      (5, { id = 5; icon = "hammer"; title = t("Renovering", "Renovation"); description = t("Totalrenovering eller varsam upprustning av äldre hus med respekt för husets karaktär.", "Full renovation or careful restoration of older houses, respecting their character."); image = null; order = 2; active = true }),
      (6, { id = 6; icon = "kitchen"; title = t("Köksrenovering", "Kitchen renovation"); description = t("Från planering och rivning till montering av skåp, bänkskivor och vitvaror.", "From planning and demolition to fitting cabinets, worktops and appliances."); image = null; order = 3; active = true }),
      (7, { id = 7; icon = "bath"; title = t("Badrum & våtrum", "Bathrooms & wet rooms"); description = t("Behöriga våtrumsmontörer enligt branschregler Säkra Våtrum.", "Certified wet-room installers following Swedish industry standards."); image = null; order = 4; active = true }),
      (8, { id = 8; icon = "extension"; title = t("Tillbyggnad", "Extensions"); description = t("Mer plats för familjen – tillbyggnader, uterum, attefallshus och garage.", "More room for the family – extensions, sunrooms, annex houses and garages."); image = null; order = 5; active = true }),
      (9, { id = 9; icon = "roof"; title = t("Tak & fasad", "Roof & facade"); description = t("Takbyte, tilläggsisolering, fasadrenovering, målning och fönsterbyte.", "Roof replacement, insulation, facade renovation, painting and window replacement."); image = null; order = 6; active = true }),
    ]);

    let projects = Map.fromArray<Nat, Project>([
      (10, {
        id = 10;
        title = t("Modern villa i Täby", "Modern villa in Täby");
        description = t("Nyckelfärdig enplansvilla på 165 m² med stora glaspartier och öppen planlösning.", "Turnkey single-storey villa of 165 m² with large glazing and an open-plan layout.");
        category = t("Nybyggnation", "New construction");
        location = "Täby";
        year = "2025";
        images = [img("1600596542815-ffad4c1539a9"), img("1600607687939-ce8a6c25118c"), img("1600566753190-17f0baa2a6c3")];
        featured = true;
        order = 1;
      }),
      (11, {
        id = 11;
        title = t("Köksrenovering i Uppsala", "Kitchen renovation in Uppsala");
        description = t("Totalrenovering av kök i 1930-talshus med platsbyggda snickerier.", "Complete renovation of a kitchen in a 1930s house with custom joinery.");
        category = t("Renovering", "Renovation");
        location = "Uppsala";
        year = "2025";
        images = [img("1484154218962-a197022b5858"), img("1556911220-bff31c812dba")];
        featured = true;
        order = 2;
      }),
      (12, {
        id = 12;
        title = t("Badrum i Solna", "Bathroom in Solna");
        description = t("Nytt badrum med klinker, golvvärme och walk-in-dusch.", "New bathroom with tiles, underfloor heating and walk-in shower.");
        category = t("Badrum", "Bathroom");
        location = "Solna";
        year = "2024";
        images = [img("1552321554-5fefe8c9ef14")];
        featured = true;
        order = 3;
      }),
      (13, {
        id = 13;
        title = t("Familjehus i Västerås", "Family house in Västerås");
        description = t("Tvåplansvilla med garage och energisnål värmepump.", "Two-storey villa with garage and an energy-efficient heat pump.");
        category = t("Nybyggnation", "New construction");
        location = "Västerås";
        year = "2024";
        images = [img("1564013799919-ab600027ffc6"), img("1570129477492-45c003edd2be")];
        featured = true;
        order = 4;
      }),
      (14, {
        id = 14;
        title = t("Vardagsrum i Nacka", "Living room in Nacka");
        description = t("Öppnad planlösning, nya golv och ljus inredning.", "Opened-up layout, new floors and a bright interior.");
        category = t("Renovering", "Renovation");
        location = "Nacka";
        year = "2024";
        images = [img("1513694203232-719a280e022f"), img("1507089947368-19c1da9775ae")];
        featured = false;
        order = 5;
      }),
      (15, {
        id = 15;
        title = t("Fritidshus i Roslagen", "Holiday home in Roslagen");
        description = t("Fritidshus med stora altaner nära havet.", "Holiday home with large decks close to the sea.");
        category = t("Nybyggnation", "New construction");
        location = "Norrtälje";
        year = "2023";
        images = [img("1572120360610-d971b9d7767c")];
        featured = false;
        order = 6;
      }),
    ]);

    let testimonials = Map.fromArray<Nat, Testimonial>([
      (16, { id = 16; name = "Anna Lindqvist"; role = t("Villaägare, Täby", "Homeowner, Täby"); quote = t("Remohusen byggde vårt hus i tid och inom budget. Proffsiga, trevliga och alltid tillgängliga.", "Remohusen built our house on time and on budget. Professional, friendly and always available."); rating = 5; avatar = ?thumb("1438761681033-6461ffad8d80"); order = 1; active = true }),
      (17, { id = 17; name = "Johan Berg"; role = t("Köksrenovering, Uppsala", "Kitchen renovation, Uppsala"); quote = t("Vårt nya kök blev bättre än vi vågat drömma om. Tydlig kommunikation hela vägen.", "Our new kitchen turned out better than we dared to dream. Clear communication all the way."); rating = 5; avatar = ?thumb("1500648767791-00dcc994a43e"); order = 2; active = true }),
      (18, { id = 18; name = "Erik Svensson"; role = t("Tillbyggnad, Västerås", "Extension, Västerås"); quote = t("Noggranna hantverkare som städade efter sig varje dag. Rekommenderas varmt!", "Meticulous craftsmen who cleaned up every day. Highly recommended!"); rating = 5; avatar = ?thumb("1507003211169-0a1dd7228f2d"); order = 3; active = true }),
    ]);

    let news = Map.fromArray<Nat, NewsPost>([
      (19, {
        id = 19;
        title = t("ROT-avdraget 2026 – det här gäller", "ROT tax deduction 2026 – what applies");
        excerpt = t("Så får du upp till 50 000 kr i skattereduktion på arbetskostnaden.", "How to get up to SEK 50,000 in tax relief on labour costs.");
        body = t(
          "ROT-avdraget ger dig 30 % skattereduktion på arbetskostnaden vid reparation, underhåll, om- och tillbyggnad.\n\nVi sköter ansökan åt dig och drar av beloppet direkt på fakturan. Kontakta oss så går vi igenom vad som gäller för just ditt projekt.",
          "The ROT deduction gives you a 30% tax reduction on labour costs for repairs, maintenance, conversions and extensions.\n\nWe handle the application for you and deduct the amount directly on the invoice. Contact us and we will go through what applies to your project.",
        );
        cover = ?img("1503387762-592deb58ef4e");
        published = true;
        createdAt = seedTime;
        updatedAt = seedTime;
        publishedAt = seedTime;
      }),
      (20, {
        id = 20;
        title = t("Nytt projekt: 12 energismarta villor i Sigtuna", "New project: 12 energy-smart villas in Sigtuna");
        excerpt = t("Byggstart för vårt största villaprojekt hittills.", "Construction starts on our largest villa project to date.");
        body = t(
          "Nu har vi tagit första spadtaget för tolv energismarta villor i Sigtuna. Husen byggs med solceller, bergvärme och FTX-ventilation.\n\nInflyttning beräknas till hösten 2027.",
          "We have broken ground on twelve energy-smart villas in Sigtuna. The houses are built with solar panels, geothermal heating and heat-recovery ventilation.\n\nMove-in is expected in autumn 2027.",
        );
        cover = ?img("1589939705384-5185137a7f0f");
        published = true;
        createdAt = seedTime + day;
        updatedAt = seedTime + day;
        publishedAt = seedTime + day;
      }),
      (21, {
        id = 21;
        title = t("5 tips inför din badrumsrenovering", "5 tips before your bathroom renovation");
        excerpt = t("Planera rätt från början och undvik dyra misstag.", "Plan right from the start and avoid costly mistakes.");
        body = t(
          "1. Välj behöriga våtrumsmontörer.\n2. Tänk på förvaring tidigt.\n3. Satsa på golvvärme.\n4. Välj tidlösa material.\n5. Planera belysningen i flera nivåer.",
          "1. Choose certified wet-room installers.\n2. Think about storage early.\n3. Invest in underfloor heating.\n4. Choose timeless materials.\n5. Plan lighting on several levels.",
        );
        cover = ?img("1552321554-5fefe8c9ef14");
        published = true;
        createdAt = seedTime + 2 * day;
        updatedAt = seedTime + 2 * day;
        publishedAt = seedTime + 2 * day;
      }),
    ]);

    let about : AboutPage = {
      heroTitle = t("Om Remohusen", "About Remohusen");
      heroText = t("Vi är ett familjeägt byggföretag med passion för hantverk, kvalitet och nöjda kunder.", "We are a family-owned construction company with a passion for craftsmanship, quality and happy customers.");
      heroImage = ?img("1504307651254-35680f356dfd");
      storyTitle = t("Vår historia", "Our story");
      storyText = t(
        "Remohusen grundades 2008 av två snickare med en gemensam vision: att bygga och renovera hem med samma omsorg som om de vore våra egna.\n\nI dag är vi ett team på över 25 hantverkare, projektledare och konstruktörer som tillsammans har genomfört fler än 400 projekt i Stockholm, Uppsala och Mälardalen.",
        "Remohusen was founded in 2008 by two carpenters with a shared vision: to build and renovate homes with the same care as if they were our own.\n\nToday we are a team of more than 25 craftsmen, project managers and engineers who together have completed more than 400 projects in Stockholm, Uppsala and the Mälaren valley.",
      );
      storyImage = ?img("1621905251189-08b45d6a269e");
      values = [
        { icon = "shield"; title = t("Trygghet", "Reliability"); text = t("Fasta priser, skriftliga avtal och försäkringar enligt ABS 18.", "Fixed prices, written contracts and insurance according to Swedish consumer standards.") },
        { icon = "award"; title = t("Kvalitet", "Quality"); text = t("Certifierade hantverkare och noggrann egenkontroll i varje steg.", "Certified craftsmen and thorough quality control at every step.") },
        { icon = "leaf"; title = t("Hållbarhet", "Sustainability"); text = t("Energismarta lösningar och miljömedvetna materialval.", "Energy-smart solutions and environmentally conscious material choices.") },
        { icon = "users"; title = t("Personligt", "Personal"); text = t("En fast projektledare följer dig från start till mål.", "A dedicated project manager follows you from start to finish.") },
      ];
      stats = [
        { value = "18+"; caption = t("År i branschen", "Years in business") },
        { value = "400+"; caption = t("Genomförda projekt", "Completed projects") },
        { value = "25"; caption = t("Hantverkare", "Craftsmen") },
        { value = "98%"; caption = t("Nöjda kunder", "Satisfied customers") },
      ];
      team = [
        { name = "Mikael Andersson"; role = t("VD & grundare", "CEO & founder"); photo = ?thumb("1507003211169-0a1dd7228f2d") },
        { name = "Sara Nilsson"; role = t("Projektledare", "Project manager"); photo = ?thumb("1438761681033-6461ffad8d80") },
        { name = "Daniel Ek"; role = t("Arbetsledare", "Site manager"); photo = ?thumb("1500648767791-00dcc994a43e") },
      ];
    };

    let contact : ContactInfo = {
      title = t("Kontakta oss", "Contact us");
      intro = t("Berätta om ditt projekt så återkommer vi inom 24 timmar med ett kostnadsfritt förslag.", "Tell us about your project and we will get back to you within 24 hours with a free proposal.");
      phone = "+46 8 123 456 78";
      email = "info@remohusen.se";
      address = "Byggvägen 12";
      postalCode = "123 45";
      city = "Stockholm";
      openingHours = t("Mån–Fre 07:00–17:00", "Mon–Fri 07:00–17:00");
      mapLat = "59.3293";
      mapLng = "18.0686";
      heroImage = ?img("1503387762-592deb58ef4e");
    };

    let settings : Settings = {
      companyName = "Remohusen";
      tagline = t("Bygg & renovering i hela Mellansverige", "Construction & renovation across central Sweden");
      footerText = t("Remohusen AB bygger nya hem och renoverar befintliga med kvalitet, trygghet och omtanke.", "Remohusen AB builds new homes and renovates existing ones with quality, reliability and care.");
      orgNumber = "559123-4567";
      rotNotice = t("Vi drar ROT-avdraget direkt på fakturan.", "We deduct the ROT tax relief directly on the invoice.");
      socials = { facebook = "https://facebook.com"; instagram = "https://instagram.com"; linkedin = "https://linkedin.com" };
    };

    {
      auth = {
        var admin = null;
        sessions = Map.empty();
        var failedAttempts = 0;
        var windowStart = 0;
        var lockedUntil = 0;
      };
      content = {
        var settings = settings;
        var about = about;
        var contact = contact;
        slides;
        services;
        projects;
        testimonials;
        news;
        var nextId = 100;
      };
      imageState = {
        images = Map.empty();
        uploads = Map.empty();
        var nextId = 1;
      };
      messageState = {
        messages = Map.empty();
        var nextId = 1;
        var windowStart = 0;
        var windowCount = 0;
      };
    };
  };
};
