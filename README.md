# Remohusen

A full-stack website for **Remohusen**, a Swedish construction company working on renovation, new houses, extensions and related work. It runs entirely on the [Internet Computer](https://internetcomputer.org).

- **Public site**: a modern glassmorphism landing page in Swedish and English. It has a hero slideshow, services, a project gallery with a lightbox, the work process, testimonials, news, an About us page and a Contact page with a contact form and map.
- **Admin panel** (`/admin`): sign in with a username and password to manage all content.

## Stack

| Part | Technology |
|------|------------|
| Backend | Motoko canister (`backend/`), using enhanced orthogonal persistence |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Motion and Lucide icons (`frontend/`), served from an asset canister |
| Tooling | [`icp` CLI](https://github.com/dfinity/icp-cli), [`mops`](https://mops.one), Node.js 22+ |

## Getting started

```bash
# 1. Start a local network (gateway on port 8010, see icp.yaml)
icp network start -d

# 2. Build and deploy both canisters
icp deploy

# 3. Create the first admin. Only a controller of the canister may call this.
icp canister call backend bootstrapAdmin '("admin", "a-strong-password")'
```

Then open:

- Website: http://frontend.local.localhost:8010/
- Admin panel: http://frontend.local.localhost:8010/admin

> **Current local deployment:** the admin login is `admin` / `Remohusen123!`.
> Change it right away under **Admin → Account**.

### Frontend development server

The dev server needs the backend canister to be deployed:

```bash
cd frontend
npm install
npm run dev
```

## Admin features

| Section | What you can do |
|---------|-----------------|
| Dashboard | See counts and use quick actions |
| Inbox | Read contact form messages, mark them read or unread, delete them |
| Slideshow | Add, edit, reorder and hide hero slides (image, title, subtitle, button) |
| Services, Projects, Testimonials | Full CRUD with ordering and a visibility toggle; projects support galleries |
| News | Write posts with a cover image, excerpt, body and publish date; save as draft or publish |
| About us | Edit the story text and image, key figures, values and team members |
| Contact us | Edit the address, phone, email, opening hours, org. number, map and social links |
| Image library | View all uploaded images and every image URL used on the site, see where each one is used, delete unused uploads |
| Site settings | Edit the company name, tagline, footer text and social links, plus all SEO settings (see below) |
| Account | Change the admin password |
| Documents | Generate branded customer PDFs, manage issued invoices/credits/payments, share expiring links, prepare private accounting worksheets and review KB obligations |

Admin defaults to **Swedish**. Use **Svenska / English** in the sidebar (or mobile header/login screen) to switch the interface; the choice is remembered in this browser independently of the public website and PDF language. Switching never translates or overwrites customer-entered content.

Localised website-content fields have side-by-side **Swedish and English** inputs. If the English content is empty, the site falls back to the Swedish content.

### Documents for a Swedish kommanditbolag

Open **Admin → Documents**. The four tabs are **Customer documents**, **Accounting & tax**, **Obligations** and **Document settings**.

**Setup**

- Initial legal-name/contact/header/footer values come from Site settings and Contact. Save the private document settings separately: registered KB name, organisation/VAT numbers, F-tax status, payment instructions, optional custom PNG/JPEG logo, invoice prefix, reporting profile and existing accounting/archive service.
- The letterhead uses the website's Remohusen logo and navy/amber colours by default. In Document settings, upload a PNG/JPEG to use a custom logo, or select **Use default logo** to restore the website logo. Changes apply to newly rendered PDFs; already finalised PDFs remain unchanged.
- Line breaks in custom headers and footers are retained. If the combined company details take too much room on a page, Document settings highlights the field that needs shortening before issuing.
- VAT registration, employees, partner types, accounting method and VAT reporting period start as **not confirmed**. Confirm the applicable profile with your accountant.
- Saving customer records is blocked until storage/privacy and archive arrangements have been explicitly confirmed. For local testing, use synthetic data only. ICP replication is **not** proof that Swedish accounting storage or GDPR requirements are met.
- Swedish is the default document language; English can be selected. Fonts are bundled locally, including Swedish PDF glyphs; document pages do not load Google Fonts.

**Customer workflow**

Templates cover quotations, order confirmations, ÄTA/change orders, invoices (standard, advance, progress, final and ROT), credit invoices, payment reminders/confirmations, handover records and letters. These are company documents, not authority-issued certificates or a legal e-signature service.

1. Use **New document / Skapa dokument** in the page header to open the same overlay sidebar used by Projects and Slideshows. Empty fields have illustrative placeholders; these are not saved values. Expand **How documents work / Så fungerar dokument** for instructions and **Preview sample PDF / Förhandsvisa exempel-PDF**, which uses clearly labelled fictional data and saves nothing.
2. Fill in the actual document, then preview/download a visibly marked draft PDF or **Save draft**, which closes the sidebar and updates the list. Invalid fields turn red, show a localised message and receive focus. Closing with unsaved document, payment or evidence changes asks for confirmation. PDF previews open above the editor without losing entered details.
3. Issue the document. The backend validates and freezes its content, branding and totals, allocating an invoice number atomically. Repeated issue requests do not allocate another number.
4. Finalise the PDF. If rendering/upload fails, the issued number remains allocated and **Retry pending PDF finalisation** resumes the workflow. Final PDF bytes and SHA-256 are retained; later settings/template/logo changes do not rewrite them.
5. Download the PDF and export the archive record. Transfer both to the existing accounting service and record its receipt/reference. Exporting alone does not mark a document as archived. Verify the selected financial year end and retention date with the accountant.
6. Optionally create a customer link. Links expire after 30 days, can be rotated/revoked, and disclose only that final customer PDF. Anyone holding the link can view it; revocation cannot recall downloaded copies. Internal notes, imports and tax worksheets are never shared. The token is passed in the URL fragment and removed from visible history.

**Where documents are stored**

**Saved documents / Sparade dokument** (previously “Document register”) uses the same collection rows as Projects and Slideshows. Click a title or edit/view icon to open the sidebar. Row icons offer PDF preview, download, sharing/payments, archive export and pending-PDF retry as applicable. Drafts can be deleted after confirmation; issued-document deletion is disabled. Search, document-type and status filters sit above the list and affect only the current page (up to 25 records); creation is a separate header action, not part of search.

Draft data, issued records and final PDF chunks are stored persistently in the application's **backend canister**, behind admin authentication. Preview-only/sample PDFs are temporary browser blobs and do not enter the list. Downloads are saved by your browser to your chosen download location. The existing accounting service remains the statutory archive; this workspace is not that archive.

The PDF renderer and its embedded fonts load with the document workspace, rather than importing a deployment-specific PDF chunk when preview/download is clicked. This avoids late missing-chunk failures after a frontend deployment and does not reload or discard a draft. If an older page is already open during this update, save its draft and refresh Admin once.

Issued documents cannot be edited or deleted. Create linked full/partial credits for ordinary invoices; credit net/VAT/gross totals cannot exceed the remaining original amounts. Record bank payments with unique references. Payment confirmations and reminders freeze the original invoice's recorded payment/outstanding amount at issue, without automatically adding fees or interest.

Amounts use integer öre, thousandths for quantities, and basis points for VAT/discounts. Net lines are rounded half-up after quantity/discount; VAT is rounded half-up per line. Backend totals are authoritative.

**Important boundaries**

- Standard supported VAT rates are 6%, 12% and 25%; exempt lines need an explicit reason. Construction reverse charge requires buyer VAT identity and an eligibility confirmation, not merely a business-customer flag.
- Preliminary ROT currently supports reviewed **2026**, single-customer Swedish 25%-VAT work: up to 30% of eligible labour, capped at SEK 50,000. It does not check allowance consumed elsewhere or guarantee eligibility. Materials/travel are separate. Other years, multi-owner allocation and ROT credit corrections require the accountant's workflow. Keep personal identity numbers and official ROT requests/decisions in that service. Claim only after eligible work and payment.
- Covered public procurement generally requires a **structured e-invoice**. A PDF or share link does not satisfy this. Send through the existing accounting service and record its actual receipt/reference; sharing never marks an e-invoice as sent.
- The workspace does not perform government submissions, payroll calculations, certified cash-register transactions, BankID signatures or statutory annual-report generation.
- At most 100 lines/document, 1,000 workspace documents and 4 MB/final PDF are supported. The document register is paginated, with search/filter applying to the displayed page.

**Private accounting preparation**

Import accountant-approved CSV summaries locally in the Accounting & tax tab. CSV data stays in browser memory and is cleared when leaving that tab; it is not uploaded to the backend. Do not include personal identity numbers or raw employee identities.

The canonical header is:

```csv
company,period_start,period_end,record_id,date,account,debit_ore,credit_ore,report_fields,source_ref
```

Download a synthetic example in the UI. Files are comma-separated with quoted fields supported, limited to 5 MB/10,000 rows. Amounts are non-negative integer öre; each row has a unique ID, four-digit BAS account and archive/source reference. A row cannot have both debit and credit. Company, dates/periods, balance, duplicates and mapping syntax are checked.

Mappings are explicit and accountant-approved, for example `VAT:10:-` maps credit-minus-debit to VAT box 10. Separate multiple mappings with `;`; use `NONE` only for reviewed non-reporting rows. Supported worksheet groups are `VAT`, `INK4R`, `INK4S`, `INK4DU`, `N3A`, `N3B` and `AGI`; `YEAR-END` lists imported account balances/movements for review. Field codes are **not** validated as official declaration forms.

Exports require reviewer/reconciliation notes and explicit source-completeness confirmation. They identify period, mappings and source references and are labelled **preparation only / not filed**. Missing report mappings or structural errors block export. Include opening balances, all relevant transactions, closing adjustments and approved payroll data as appropriate. Do not combine imported copies and app invoices a second time. Full annual accounts, partner allocations/loss restrictions, disclosures and tax correctness require professional review.

**Core KB obligations**

The Obligations tab links to official guidance for registration and genuine certificates, continuous bookkeeping, annual closing/report applicability, INK4 schedules and N3A/N3B, VAT, ROT, AGI, consumer agreements, construction personnel/site records and cash-register requirements where applicable. Accounting records generally remain archived through the end of the seventh year after the calendar year in which the financial year ended; the existing accounting service remains the legal archive. This is a core checklist, not every industry/site-specific requirement.

Primary sources: [Skatteverket: KB declarations](https://www.skatteverket.se/foretag/inkomstdeklaration/deklareraatetthandelsbolag), [invoice requirements](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html), [ROT](https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut), [BFN: HB/KB accounting](https://www.bfn.se/redovisningsregler/vad-galler-for/handelsbolag/), [archiving](https://www.bfn.se/fragor-och-svar/arkivering/), and [structured public-procurement invoice law](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-20181277-om-elektroniska-fakturor-till_sfs-2018-1277/). Rules/templates require review as legislation changes; the initial guidance was checked in October 2026.

**Validation**

```bash
cd backend && mops check && mops test documents
cd ../frontend && npm test && npm run build
```

Live integration tests additionally require a **fresh, isolated local canister** with the anonymous principal as controller; never use a real/company canister. Install the built backend WASM into it, then set `DOCUMENT_TEST_CANISTER` and `DOCUMENT_TEST_WASM=../backend/.mops/.build/backend.wasm` when running `npm test`. The test generates ephemeral admin credentials, exercises issuance, credits/payments, bearer access and an actual upgrade, and verifies persisted documents/PDF hashes and public content.

Browser tests use `npm run test:browser` with a separate fresh `DOCUMENT_BROWSER_CANISTER`, the frontend deployed locally on port 8010, and a Playwright Chromium installation (`npx playwright install chromium`). `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing executable. Browser tests route only their own context to the synthetic backend, check real PDF download/sharing/revocation/mobile layout and reject third-party requests. Stop/delete only these explicitly created test canisters afterwards.

### Images: upload or URL

Every image field in the admin panel accepts an image in three ways:

1. **Upload**: the file is resized in the browser (max 1920 px, WebP) and stored in the backend canister in chunks.
2. **From URL**: paste any `https://` image URL. A live preview is shown, and the site loads the image directly from that URL.
3. **Library**: reuse an image you have already uploaded.

When an edit window opens on an image that comes from a URL, the **From URL** tab is selected and already holds the current URL. Below it, **Already used on the site** lists every image URL in use (slides, services, projects, news, About page, share image). Click one to reuse it. Gallery fields mark URLs that are already in the gallery as *Added*.

In the backend this is modelled as `ImageRef = #stored : Nat | #url : Text`. URLs are validated to `http(s)` only, so `javascript:` and `data:` URLs are rejected.

## SEO

What the site does on its own:

- Each page sets its own `<title>`, meta description, canonical URL, Open Graph and Twitter tags, and `hreflang` alternates.
  - Swedish is the default.
  - English is crawlable at `?lang=en`.
- JSON-LD structured data:
  - `LocalBusiness` (for example `GeneralContractor`) with the address, phone, map position, area served and social profiles;
  - `WebSite`;
  - `BreadcrumbList`;
  - `NewsArticle` for each news post.
- The build generates `robots.txt` (blocks `/admin`) and `sitemap.xml` (all pages plus published news, with language alternates).
- `index.html` contains static default tags and a `<noscript>` fallback for crawlers that don't run JavaScript.
- `public/_headers` sets caching and security headers.

You can edit these under **Admin → Site settings**:

| Card | Settings |
|------|----------|
| Search engines | Canonical website address, the "allow indexing" switch, keywords |
| Page titles & descriptions | Meta title and description for the Home, About, News and Contact pages (SV and EN), with length counters and a Google preview |
| Social sharing | Default share image (Open Graph), as an `https://` URL |
| Local business | schema.org business type, area served, price range |
| Site verification | Google Search Console and Bing Webmaster codes. You can paste the whole `<meta>` tag. |

**Before deploying to mainnet:**

- Set `SITE_URL` in `frontend/.env.production` to the real domain, for example `https://www.remohusen.se`.
- Set the same address under Site settings → Website address.

**Caveats:**

- `sitemap.xml` is generated at build time. New news posts appear in it after the next frontend deploy.
- Uploaded (canister-stored) images can't be used as share images, so the share image takes a URL only. News posts whose cover is an uploaded image use the default share image.
- Facebook, LinkedIn and other link previews only read the static tags in `index.html`.
- If the Google verification `<meta>` tag isn't detected, verify the domain through DNS instead.

## Security notes

- Passwords are stored as salted SHA-256 hashes. Logins are rate-limited, and sessions are random tokens that expire after 8 hours. The token is kept in `sessionStorage`.
- `bootstrapAdmin` works only while no admin exists, and only for a canister controller.
- **Forgot the password?** A controller can reset it:

  ```bash
  icp canister call backend resetAdminCredentials '("admin", "new-password")'
  ```

## Project structure

```
icp.yaml                  canisters + local network (port 8010)
backend/
  src/main.mo             actor; composes the mixins
  src/types.mo            shared types (L10n, ImageRef, Slide, NewsPost, ...)
  src/lib/                pure logic (Auth, Content, Images, Messages, Validate)
  src/mixins/             public API split by area
  src/migrations/         enhanced-persistence migrations
  backend.did             generated Candid (frontend bindings are built from it)
frontend/
  public/                 logo.svg, favicon.svg, _redirects (SPA fallback)
  src/components/         public UI (Navbar, HeroSlideshow, SmartImage, ...)
  src/pages/              Home, About, News, Contact, NotFound
  src/admin/              admin panel (lazy-loaded)
  src/lib/                API client, i18n, site context, image helpers
```

## Changing the backend interface

After changing any public method or type in the backend, regenerate the Candid file and redeploy:

```bash
cd backend && mops generate candid backend && cd ..
icp deploy
```

Stable state uses enhanced orthogonal persistence. If a change to a stable type is incompatible with the old one, add a migration under `backend/src/migrations/`.
