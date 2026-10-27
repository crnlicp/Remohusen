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

All text fields have side-by-side **Swedish and English** inputs. If the English text is empty, the site falls back to the Swedish text.

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
