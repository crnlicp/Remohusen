module {
  type L10n = { sv : Text; en : Text };
  type PageMeta = { title : L10n; description : L10n };
  type SeoSettings = {
    siteUrl : Text;
    home : PageMeta;
    about : PageMeta;
    news : PageMeta;
    contact : PageMeta;
    keywords : L10n;
    ogImage : Text;
    allowIndexing : Bool;
    googleVerification : Text;
    bingVerification : Text;
    businessType : Text;
    areaServed : Text;
    priceRange : Text;
  };

  type OldActor = {};
  type NewActor = { seoState : { var seo : SeoSettings } };

  public func migration(_ : OldActor) : NewActor {
    {
      seoState = {
        var seo = {
          siteUrl = "";
          home = {
            title = {
              sv = "Remohusen – Bygg, renovering & nybyggnation i Stockholm";
              en = "Remohusen – Construction, renovation & new homes in Stockholm";
            };
            description = {
              sv = "Remohusen bygger nya hus och renoverar kök, badrum och hela hem i Stockholm, Uppsala och Mälardalen. Fast pris, ROT-avdrag och trygg process. Begär offert!";
              en = "Remohusen builds new houses and renovates kitchens, bathrooms and entire homes in Stockholm, Uppsala and Mälardalen. Fixed prices and a safe process. Request a quote!";
            };
          };
          about = {
            title = { sv = "Om oss"; en = "About us" };
            description = {
              sv = "Lär känna Remohusen – ett familjeägt byggföretag med erfarna hantverkare, fasta priser och fokus på kvalitet sedan 2008.";
              en = "Get to know Remohusen – a family-owned construction company with experienced craftsmen, fixed prices and a focus on quality since 2008.";
            };
          };
          news = {
            title = { sv = "Nyheter"; en = "News" };
            description = {
              sv = "Nyheter, projektuppdateringar och tips om renovering och nybyggnation från Remohusen.";
              en = "News, project updates and tips on renovation and new construction from Remohusen.";
            };
          };
          contact = {
            title = { sv = "Kontakta oss"; en = "Contact us" };
            description = {
              sv = "Kontakta Remohusen för ett kostnadsfritt hembesök och en fast offert på ditt bygg- eller renoveringsprojekt.";
              en = "Contact Remohusen for a free home visit and a fixed quote for your construction or renovation project.";
            };
          };
          keywords = {
            sv = "byggföretag, renovering, nybyggnation, badrumsrenovering, köksrenovering, tillbyggnad, takbyte, ROT-avdrag, Stockholm";
            en = "construction company, renovation, new build, bathroom renovation, kitchen renovation, extension, roofing, Stockholm, Sweden";
          };
          ogImage = "";
          allowIndexing = true;
          googleVerification = "";
          bingVerification = "";
          businessType = "GeneralContractor";
          areaServed = "Stockholm, Uppsala, Mälardalen";
          priceRange = "$$";
        };
      };
    };
  };
};
