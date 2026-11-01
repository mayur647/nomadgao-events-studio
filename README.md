# NomadGao Events Studio

Community managers fill in a short form for each event. On Monday the studio makes:

- a **joint weekly calendar** (Goa + Dharamkot)
- a **weekly calendar per location**
- a **poster for every event**

…in **3 sizes** (Story 1080×1920, Post 1080×1350, Square 1080×1080), with **3 captions each** (Instagram, WhatsApp groups, local community group). Download one PNG, all sizes, or the whole week as a ZIP; or send straight to WhatsApp / the share sheet.

Everything runs on free tiers: **Vercel** (hosting), **Supabase** (logins, database, photo storage, RSVPs), **Google Gemini** (optional AI captions). Posters are drawn in the browser, so there's no image-rendering server to pay for.

## What's inside

| Area | What it does |
|---|---|
| `/` Studio | Pick the week → every poster + caption appears. Shuffle all or one. Download PNG / 3 sizes / ZIP, WhatsApp, Share. |
| `/events` | Shared list of both locations' events, with filters (week, upcoming, past, location, brand, type, search). Add, edit, copy to next week, delete. RSVP head-counts. |
| `/gallery` | 5–10 photos per event type per location. Each shuffle picks a different one. |
| `/admin` | Admins only: posters made (by person, kind, location, action), recent activity, approve people & set roles, RSVP lists (+CSV), export all form data. |
| `/rsvp/[id]` | Public RSVP page for events that use "Our RSVP form". Caps at the seat limit, then waitlists. |
| `/samples` | Public preview of every layout with made-up events. |

**Design system** — one system, two themes. Goa: sunsets, sea, palms, Goan-house pinks and yellows. Dharamkot: snow peaks, deodars, prayer flags, a monk under an umbrella, stupa; pine, saffron and maroon. Hotpot House red/yellow and its hotpot-table line art join when that brand is ticked. 6 event layouts (Arch window, Ticket, Polaroid, Big date, Full photo, Postcard), 3 calendar layouts, 2 joint layouts, 12+ palettes, 5 display fonts. The look changes every week automatically; **Shuffle** changes it on demand.

**Captions** — template captions are instant and free. "✨ Rewrite with AI" uses Gemini with the NomadGao/Hotpot House voice. Instagram captions carry at most **5 hashtags** (Instagram's limit since Dec 2025): brand + place + event type + community.

## Roles

- **Admin** — everything, plus stats, RSVP details, exports and access control. `mayur@nomadgao.com` becomes admin automatically (edit `admin_emails` in `supabase/schema.sql` to add more).
- **Community manager** — add/edit events, upload photos, make posters and captions, see RSVP counts.
- New sign-ups wait for an admin to approve them in **Admin → People & access**.

## One-time setup

### 1. Supabase (free)
1. Create a project at [supabase.com](https://supabase.com) (region: Mumbai).
2. **SQL Editor** → paste all of `supabase/schema.sql` → Run. (Safe to re-run.)
3. **Authentication → Sign In / Providers → Email**: optionally turn **off** "Confirm email" (admins approve everyone anyway, and Supabase's free email sender only sends a few emails an hour).
4. **Authentication → URL Configuration**: set Site URL to your Vercel URL (and later your custom domain).
5. **Project Settings → API**: copy the Project URL and the `anon` key.

### 1b. Google sign-in (free)
1. [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → OAuth consent screen**: External, app name "NomadGao Events Studio", your support email, publish.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `https://nomadgao-events-studio.vercel.app` (and your custom domain later)
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Sign In / Providers → Google**: enable, paste the Client ID and Client secret, save.
4. Supabase → **Authentication → URL Configuration**: Site URL = your app URL; add `https://<your-app>/**` to Redirect URLs.

Email + password stays available under "Use email and password instead".

### 2. Gemini (free, optional)
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key. Google Cloud (Vertex AI express) keys starting with `AQ.` also work.

### 3. Vercel
Import this GitHub repo → add Environment Variables → Deploy:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GEMINI_API_KEY` | Gemini key (optional) |
| `GEMINI_MODEL` | optional, default `gemini-flash-latest` |

### 4. Custom domain (later)
Vercel → Project → Settings → Domains → add e.g. `events.nomadgao.com` and add the CNAME it shows at your DNS provider. Then add the domain to Supabase's Site URL / Redirect URLs. RSVP links and QR codes automatically use whatever domain the studio is opened on.

## Run locally
```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

## Changing things
- Venues, event types, hooks, hashtags: `src/lib/constants.ts`
- **All colours, fonts and logos: `src/brand/brand.ts`** (font files: `src/brand/fonts.ts`)
- How posters pick a palette/font: `src/lib/themes.ts`
- Line art: `src/components/posters/Art.tsx`
- Poster layouts: `src/components/posters/EventPoster.tsx`, `Calendars.tsx`
- Caption templates: `src/lib/captions.ts`; AI voice: `src/app/api/caption/route.ts`
- Logos: `public/brand/`

## Joining the NomadGao website later

**Design.** Every colour, typeface and logo the Studio uses (app screens *and* posters) lives in
`src/brand/brand.ts`. When the website's design system exists, map its tokens onto that file:
`ui` for the app, `palettes`/`hotpotPalettes` for posters, `fonts` + `fontSets` for type, `logos`
for files. Nothing else needs editing for a colour/type change. A new *visual style* (different
shapes, illustration, grid) means redrawing the layouts in `src/components/posters/`.

**Public events feed.** Run `supabase/migrations/003_public_feed.sql` once, then any website can read:

| URL | Returns |
|---|---|
| `/api/public/events` | JSON of the next 60 days, both locations |
| `?location=goa` or `?location=dharamkot` | one location |
| `?days=14` | a shorter window (1–366) |
| `?brand=hotpot` | only Hotpot House events |
| `?format=ics` | a calendar people can subscribe to in Google/Apple Calendar |

Open to any site (CORS `*`), cached 5 minutes, residents-only events and all guest/team data
left out. Each event includes its fee label, venue, RSVP link (our form, a link, or WhatsApp) and
spots left, so the website can link straight to `/rsvp/<id>`.

**Hosting.** Either merge this Next.js app into the website (if it's Next.js) as `/studio`, or keep
it separate at `studio.nomadgao.com` sharing the same Supabase database.
