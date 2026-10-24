# Pebble 🪨✨

**A calmer, prettier place for small circles.**

Pebble is a mini social platform for friends, classmates, hobby communities and small creators. Short posts, photos, polls and 24-hour stories; six expressive animated reactions; threaded comments; circles; and real-time chat — with a **chronological feed by default**, a gentle **"You're all caught up"** moment, and no algorithmic outrage.

> ## ⚠️ Demo platform — fictional data
> Every seeded user, post, photo caption, chat message and statistic in this repository is **FICTIONAL test data**. No real people's names, likenesses or brand marks are used for demo accounts. Photos are free-license stock images (Unsplash / Picsum) chosen to avoid identifiable people. See **Legal & compliance notes** before any real launch.

---

## Screenshots

| Landing (Sunset Glass) | Home feed + stories | Reactions tray |
| --- | --- | --- |
| ![landing](docs/screens/landing.png) | ![home](docs/screens/home.png) | ![reactions](docs/screens/reactions.gif) |

| Story viewer | Real-time chat | Moderation dashboard |
| --- | --- | --- |
| ![stories](docs/screens/stories.png) | ![chat](docs/screens/chat.png) | ![moderation](docs/screens/moderation.png) |

*(placeholders — drop your captures into `docs/screens/`)*

---

## Features

**Core**
- Email/password auth (bcrypt, httpOnly DB-backed sessions), roles `member | moderator | admin`, honeypot + rate limits, mock email verification logged to the console. Google sign-in is stubbed (needs `GOOGLE_CLIENT_ID/SECRET`).
- 3-step animated onboarding: avatar (DiceBear styles or URL) → interests → follow suggestions.
- Posts: 500-char text with live ring counter, up to 4 image URLs with per-image alt text, polls (2–4 options, duration), SSRF-safe link previews, hashtags, @mentions with autocomplete, scheduling, edit within 15 min, delete anytime.
- Feeds: **Following** (strictly chronological, cursor-paginated, "New posts" pill, "You're all caught up" with checkmark + confetti) and **Discover** (recent popular, formula shown in the UI and on every card).
- Reactions (Love, Laugh, Wow, Hug, Fire, Clap) with press-and-hold tray and per-reaction micro-animations, two-level comment threads, reposts & quotes, private bookmarks, share link.
- Stories: image or text, 24h expiry by the worker, gradient rings (rotating when unseen), full-screen viewer with progress bars, tap/keys to advance, swipe-down to close, cube-style transition, viewer list for the author, graceful "expired while open" state.
- Profiles: banner parallax, docking avatar, bio/link, pinned post, follower counts, tabs (Posts/Replies/Media/Likes), follow button that morphs, **private accounts with follow requests**.
- Circles: public & private, cover (Ken Burns), rules, members list with fan-out stack, circle feed, moderators approving requests.
- Real-time DMs & groups (≤ 8) via **Server-Sent Events**: optimistic bubbles, typing dots, read receipts, message reactions, unread badges, offline queue with retry, idempotent sends.
- Notifications center with smart grouping ("Maya and 5 others reacted"), per-type preferences, live updates.
- Search (users, posts, hashtags, circles) with recent searches and a 24h trending panel computed from real activity.
- Safety: report (post/comment/user/message), block, mute, muted words, hide post, who-can-message / who-can-mention, **Take a break**.
- Moderation & admin: reports queue with context, dismiss/remove/warn/suspend, appeals (accept restores content), transparent removal reasons shown to authors, audit log, user management, Recharts analytics (DAU, posts, comments, reports resolved).
- Settings: profile, privacy, notifications, safety, appearance (theme, accent, **reduce motion**, sounds), data export (JSON), account deletion with 14-day grace.
- SEO: dynamic metadata + OG images (`/api/og`), JSON-LD (Person, SocialMediaPosting, BreadcrumbList) for public content only, sitemap, robots, `noindex` on private pages.

**Not (yet) implemented from the wishlist:** Cloudinary uploads (URL-based media only), voice notes, Moments photo wall, i18n, PWA push. GSAP/Lenis were swapped for Framer Motion scroll primitives to keep the bundle small; see *Future improvements*.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 4 (design tokens via `@theme`), Phosphor icons, Google Fonts |
| Motion | Framer Motion (layout, springs, scroll), canvas-confetti |
| State | Zustand (UI / composer), small fetch wrapper (`src/lib/client.ts`) |
| Data | **PostgreSQL + Drizzle ORM** (`src/db/schema.ts`) |
| Realtime | SSE route handler (`/api/realtime`) + in-memory typing/presence |
| Worker | `src/lib/jobs.ts` — runs inline via `instrumentation.ts` every 60s, or standalone `worker/index.ts` |
| Validation | Zod on every mutation |
| Charts | Recharts |
| Tests | Vitest (`tests/rules.test.ts`) |

> The brief asked for Prisma/SQLite; this template ships PostgreSQL + Drizzle, which is what the schema uses. Point `DATABASE_URL` at Neon/Supabase to deploy.

---

## Design system — "Sunset Glass"

Warm cream surfaces, frosted-glass cards, and a summer-evening gradient reserved for story rings, primary buttons, reaction highlights and key moments. Neutral surfaces carry ~80 % of the page; flat coral is the everyday action color; deep coral is used for small text on light surfaces for AA contrast.

| Token | Light | Dark |
| --- | --- | --- |
| background | `#FFF8F3` | `#140C16` |
| surface | `#FFFFFF` | `#1E1322` |
| glass | `#FFFFFFB3` + blur | `#2A1B30B3` + blur |
| elevated | `#FFEFE6` | `#33223A` |
| hairline | `#F2DED2` | `#46304D` |
| text | `#2A1722` | `#FBEFF3` |
| muted | `#7D6573` | `#B49CB9` |
| focus ring | violet `#7B5CFF` | peach `#FFA877` |

Brand: coral `#FF5E6C`, deep coral `#D93A4A`, peach `#FFA877`, magenta `#E83E9B`, violet `#7B5CFF`, lilac `#E9E1FF`, mint `#3DDBB0`, sky `#5CC8FF`.
Sunset gradient: `linear-gradient(135deg,#FFA877 0%,#FF5E6C 40%,#E83E9B 70%,#7B5CFF 100%)`.
Reactions: Love `#FF4D6D`, Laugh `#FFC233`, Wow `#6C8CFF`, Hug `#FF9A3D`, Fire `#FF6A2B`, Clap `#B07CFF`. Status: success `#22C58B`, warning `#F5A524`, error `#F0445A`.

Fonts: **Bricolage Grotesque** (600/800) headings, **Figtree** body, **Caveat** for playful accents (story text, empty states). Radius 24px cards/media, 14px inputs, 999px pills. Story rings = gradient + 3px white gap. Image grids = 2px gaps, rounded outer corners.

---

## Motion design overview

- **Preloader** — colorful pebbles drop into a pond with ripple rings, settle into the wordmark, then a circular reveal expands (once per session).
- **Landing** — aurora background shifts slowly; floating post cards, reaction bubbles and a 3-D-ish pebble parallax with the pointer; staggered headline word reveal; pinned "How Pebble feels" section morphs one card through Share → React → Reply → Chat as you scroll; a clearly labeled demo feed auto-plays reactions; stat counters count up (labeled demo).
- **Feed** — posts rise in with a light stagger, images blur-up, double-tap/double-click fires a heart burst with sparkle dots, the "New posts" pill bounces down, "You're all caught up" draws a checkmark with confetti.
- **Reactions** — hold (or hover) opens a spring tray with staggered emoji; hover enlarges; selecting flies the emoji to the counter, which rolls. Each reaction has its own micro-animation (hearts float, laughs wobble, wow pops, hug squeezes, fire flickers, clap bursts).
- **Compose** — pill expands with a spring; attachments are drag-to-reorder tiles; poll options animate in/out; the character ring turns coral then red near the limit; publishing lands the card at the top of the feed.
- **Stories** — rings hue-rotate while unseen, progress bars fill per slide, swipe-down closes with a springy drag, next author slides in with a 3-D rotate.
- **Comments** — replies slide in under their parent, the thread line draws down, new comments arrive highlighted peach.
- **Profile / Circles / Chat / Notifications** — banner parallax and docking avatar, sliding tab underline, morphing follow button; Ken Burns covers, rippling join buttons, fanning avatar stacks; spring bubbles, bouncing typing dots, read-receipt avatars, floating message reactions, bouncing unread badges; staggered notification items with fan-out avatars.
- **Signature** — a soft sunset cursor halo on desktop and "breathing" avatars when a user is online.
- **Performance & reduced motion** — only `transform`/`opacity` are animated, images reserve space, long lists paginate at 15, off-screen effects pause via IntersectionObserver. `prefers-reduced-motion` *or* the in-app **Reduce motion** toggle disables parallax, cursor glow, ring rotation, bursts, confetti and long celebrations (final states shown with a simple fade) via `MotionConfig` and a global CSS override.

---

## Folder structure

```
pebble/
├── README.md · docker-compose.yml · .env.example · vitest.config.ts
├── drizzle.config.json
├── worker/index.ts                 # optional standalone worker loop
├── tests/rules.test.ts             # ranking, cursors, privacy, parsing, grouping, polls, expiry, rate limit
├── public/ (favicon.svg, manifest.json, robots.txt, sounds/)
└── src/
    ├── instrumentation.ts          # starts the inline worker (every 60 s)
    ├── app/
    │   ├── page.tsx (landing) · login/ · register/ · onboarding/ · not-found.tsx · error.tsx · sitemap.ts
    │   ├── (app)/ layout.tsx · home/ · discover/ · post/[id]/ · u/[username]/ · circles/ · circles/[slug]/
    │   │         tag/[tag]/ · messages/ · messages/[id]/ · notifications/ · bookmarks/ · search/
    │   │         settings/ · moderation/ · admin/ · policies/
    │   └── api/ auth/ · feed/ · posts/[id]/{react,comments,bookmark,repost,vote,hide,appeal} · stories/
    │            users/ · circles/ · messages/ · realtime/ (SSE) · notifications/ · search/ · trending/
    │            reports/ · moderation/ · admin/ · settings/ · link-preview/ · worker/run · og/ · health/
    ├── components/ ui/ layout/ feed/ post/ composer/ reactions/ comments/ stories/ profile/ circles/
    │               chat/ notifications/ search/ moderation/ settings/ onboarding/ auth/ animations/ landing/
    ├── hooks/ useRealtime · useKeyboardShortcuts · useReducedMotion · useCursorGlow
    ├── lib/ auth · api · permissions · feed · ranking · posts · comments · chat · notifications · notifGroup
    │        linkPreview · rateLimit · validations · jobs · bootstrap · utils · client
    ├── store/ useUiStore · useComposerStore
    ├── config/ media.ts (every external URL + credits) · site.ts (reactions, interests, limits)
    └── db/ schema.ts · index.ts · seed.ts
```

---

## Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL 14+ (local, Docker, or Neon/Supabase)

## Install & run

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env            # set DATABASE_URL

# 3. database schema
npx drizzle-kit push

# 4. seed fictional demo data (also auto-runs on first request if the users table is empty)
npx tsx src/db/seed.ts

# 5. run the app (worker runs inline inside the Next.js server)
npm run dev                      # http://localhost:3000

# optional: standalone worker (set DISABLE_INLINE_WORKER=1 in .env for the app)
npx tsx worker/index.ts

# tests / build
npx vitest run
npm run build && npm start
```

Realtime uses SSE from the Next.js server itself — there is no separate socket server to start.

### Docker Compose (Postgres only)

```bash
docker compose up -d db
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | – | Public origin for OG tags and sitemap (default `http://localhost:3000`) |
| `DISABLE_INLINE_WORKER` | – | Set `1` when running `worker/index.ts` separately |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | – | Enable Google OAuth (button is a stub until set) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | – | Signed uploads (falls back to URL input) |

---

## Database schema overview

`users` · `sessions` · `follows` · `follow_requests` · `circles` · `circle_members` · `posts` (text, circle, repost_of, link_preview, scheduled_at, published, edited_at, deleted_at, removed_reason) · `post_media` · `polls` · `poll_options` · `poll_votes` · `post_hashtags` · `mentions` · `reactions` (PK user+post) · `comments` (parent_id, 2 levels) · `bookmarks` · `stories` · `story_views` · `conversations` · `conversation_members` (last_read_at) · `messages` (client_id for idempotency) · `message_reactions` · `notifications` · `blocks` · `mutes` · `muted_words` · `hidden_posts` · `reports` · `appeals` · `audit_logs` · `trending_tags` · `daily_stats` · `recent_searches`.

## API endpoints

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Feed | `GET /api/feed?type=following\|discover&cursor=` · `GET /api/feed/new?since=` · `GET /api/bookmarks` · `GET /api/tags/:tag` |
| Posts | `POST /api/posts` · `GET/PATCH/DELETE /api/posts/:id` · `POST …/react` · `GET/POST/DELETE …/comments` · `POST …/bookmark` · `POST …/repost` · `POST …/vote` · `POST …/hide` · `POST …/appeal` |
| Stories | `GET/POST /api/stories` · `POST/GET /api/stories/:id/view` |
| Users | `POST /api/users/:username/follow\|block\|mute` · `GET /api/users/:username/posts?tab=` · `GET/POST /api/users/requests` · `GET /api/users/suggestions` · `GET /api/users/mention?q=` |
| Circles | `POST /api/circles` · `POST/PATCH /api/circles/:slug/join` · `GET /api/circles/:slug/posts` |
| Messages | `GET/POST /api/messages` · `GET/POST/DELETE /api/messages/:id` · `POST …/typing` · `POST …/read` · `POST …/react` |
| Realtime | `GET /api/realtime` (SSE) |
| Notifications | `GET /api/notifications` · `PATCH /api/notifications` |
| Search | `GET /api/search?q=` · `GET /api/trending` · `GET /api/link-preview?url=` |
| Safety | `POST /api/reports` |
| Moderation | `GET/PATCH /api/moderation/reports` · `GET/PATCH /api/moderation/appeals` · `GET/PATCH /api/moderation/users` · `GET /api/admin/analytics` · `GET /api/admin/audit` · `POST /api/worker/run` |
| Settings | `GET/PATCH /api/settings` · `GET /api/settings/export` · `POST/DELETE /api/settings/delete` |
| Misc | `GET /api/health` · `GET /api/og?title=` |

## Realtime events (SSE `data:` payloads)

| `type` | Payload |
| --- | --- |
| `hello` | `unreadNotifications`, `unreadMessages` |
| `message` | `conversationId`, `message`, `unreadMessages` |
| `notification` | `count` (unread) |
| `presence` | `online: string[]` (active in last 5 min) |
| typing | polled with the conversation (`typing: userId[]`, 4-second TTL) |

Connections are authenticated by the session cookie; the server only polls the viewer's own conversations and notifications, so room permissions hold by construction. Clients re-broadcast events on `window` (`pebble:realtime`) and reconnect with backoff.

---

## How the feeds work

**Following** — `posts` where `author ∈ {you} ∪ following`, `deleted_at IS NULL`, `published`, minus hidden/blocked/muted/suspended authors, minus private circles you're not in, minus muted words; ordered `(created_at, id) DESC` with a keyset cursor. No ranking. The "New posts" pill polls `/api/feed/new?since=<latest>` every 30 s.

**Discover** — public, non-deleted, non-repost posts from the last 7 days, scored:

```
score = (reactions×1 + comments×2 + reposts×3 + 1) / (hoursSincePost + 2)^1.5
score ×= 1.5  if the post uses a hashtag in your interests OR belongs to a circle you're in
```

Each card shows *why* it's there ("Popular in #coffee, a tag you follow", "Popular in one of your circles", "Getting friendly attention recently", "Fresh from the community"). No profile data beyond your chosen interests/circles is used. Paginated by offset cursor over the scored window.

## Privacy, blocking & private circles

`src/lib/permissions.ts → visibilityFilters(viewerId)` is applied by **every** feed, profile tab, tag page, search and `getVisiblePost`:
- **Blocks** (either direction) and **mutes** hide authors everywhere (feeds, search, comments, notifications, suggestions). Blocking removes follows both ways and pending requests; messaging a blocked user fails even mid-conversation.
- **Private accounts**: only approved followers (and staff) see content; follow attempts create requests; reposting private posts is refused; switching private→public makes posts visible again; switching back re-hides them (checks are evaluated per request, never cached).
- **Private circles**: posts never appear in feeds, search, tags or post pages for non-members; the circle page shows only name/description and a "request to join" CTA.
- Suspended users' content is hidden; deleted/removed posts render as a transparent "removed because …" card (with an appeal button for the author) and are excluded from feeds.
- Server never trusts client user IDs or timestamps; reactions/follows/votes are idempotent (primary keys + transactions).

## Stories expiry

Stories store `expires_at = created_at + 24h`. The worker (`expireStories`) flags `expired = true` every minute; `GET /api/stories` additionally filters `expires_at > now()` so nothing slips between ticks. If a story expires while open, `POST /view` returns **410** and the viewer shows an "expired" slide. The seed creates three stories expiring 2–6 minutes after seeding so you can watch the job work (`/moderation → Run worker jobs now`).

## Notification grouping

`groupNotifications()` buckets rows by `type + postId + calendar day` for groupable types (reaction, comment, follow, story_view, repost). Labels: one actor → "Maya reacted…", two → "Maya and Theo…", more → "Maya and 5 others…". Mentions, requests, poll endings and moderation notices never group. Recipients on **Take a break** or with a type disabled receive nothing (moderation notices always deliver). Repeated reactions from the same actor on the same post replace the previous notification.

## Moderation, reports & appeals

1. Anyone reports a post/comment/user/message with a reason (rate-limited).
2. Moderators/admins see the **queue with context** and choose *dismiss*, *remove content*, *warn*, or *suspend 7d*.
3. Every action writes an `audit_logs` row and sends the affected user a **moderation notification explaining why**. Removed posts show the reason in place (shadow-free).
4. The author can **appeal** from the post; moderators accept (content restored) or reject; the user is notified either way.
5. Admins additionally manage roles; moderators can suspend/unsuspend. All visible in `/moderation` (Reports · Appeals · Users · Analytics · Audit log).

## Extending

- **New reaction** — add to `REACTIONS` in `src/config/site.ts`, the `ReactionType` union in `src/db/schema.ts`, `EMPTY_COUNTS` in `src/lib/feed.ts`, the Zod enum in `validations.ts`, and a micro-animation in `ReactionButton.tsx`.
- **New circle** — use the UI (`/circles → New circle`) or append to `CIRCLES` in `src/db/seed.ts`.
- **New seed user** — append to `USERS` in `src/db/seed.ts` (fictional names only!), re-run the seed on an empty DB.

## Demo accounts (password `pebble123`)

| Role | Email | Username |
| --- | --- | --- |
| Member | `maya@pebble.demo` | @maya_draws |
| Private member | `juno@pebble.demo` | @juno_quiet (has pending follow requests) |
| Moderator | `sol@pebble.demo` | @sol_mod |
| Admin | `ada@pebble.demo` | @ada_admin |

---

## Deployment guide

- **App** — Vercel (or any Node host). Set `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`. Vercel functions are short-lived, so run the worker separately and set `DISABLE_INLINE_WORKER=1`. SSE works on Node runtimes; on serverless prefer a long-running host (Render/Railway/Fly) for `/api/realtime` or swap in Pusher/Ably.
- **Worker** — Render/Railway background service: `npx tsx worker/index.ts` with the same `DATABASE_URL`.
- **Database** — Neon or Supabase free tier; run `npx drizzle-kit push` then the seed (or let first boot seed).
- **Media** — Cloudinary free tier for uploads (add signed-upload route; currently URL-based). Keep `remotePatterns` restrictive if you switch to `next/image`.
- **Rate limiting** — in-memory by default; use Upstash Redis for multiple instances.

## Legal & compliance notes (read before any real launch)

Requirements vary by country; this is not legal advice — **consult a lawyer before going live**.

- **Minimum age & children's privacy** — enforce an age gate; comply with **COPPA** (US, under 13), **GDPR-K / Art. 8** (EU, 13–16 depending on member state), UK Age-Appropriate Design Code and similar laws. Pebble's policy page states 16+, but no age verification is implemented.
- **Privacy policy & consent** — publish a privacy policy, lawful basis, retention periods, cookie/consent handling, and data-processing agreements for hosting/media providers. Data export and deletion (with grace period) exist; add verified identity checks and request logging.
- **Content moderation duties** — human review, notice-and-action, illegal-content reporting channels and transparency reporting (EU **DSA**, UK **Online Safety Act**, etc.). Add CSAM detection/reporting (e.g., hash matching, NCMEC/IWF reporting) before accepting user image uploads.
- **DMCA / copyright** — register a designated agent, implement takedown + counter-notice flows and repeat-infringer policy. Photos used here are free-license stock; replace with your own licensed media in production.
- **Terms of service & guidelines** — acceptable use, suspension/appeal process (implemented), governing law, dispute resolution.
- **Security** — move sessions/rate limits to shared storage, add email verification (currently mocked), 2FA, CSP headers, audit retention, backups, and incident response.
- **Accessibility** — WCAG 2.2 AA is the design target; run an audit with real assistive technology before launch.

## Media credits

| Source | License | Used for |
| --- | --- | --- |
| [Unsplash](https://unsplash.com) | Unsplash License | post photos, banners, circle covers |
| [Pexels](https://www.pexels.com) | Pexels License | optional landing video |
| [Picsum Photos](https://picsum.photos) | free placeholders | fallbacks |
| [DiceBear](https://www.dicebear.com) | per-style CC BY 4.0 / CC0 | avatars |
| [Phosphor Icons](https://phosphoricons.com) | MIT | icons |
| [Google Fonts](https://fonts.google.com) — Bricolage Grotesque, Figtree, Caveat | SIL OFL | type |
| [Pixabay Audio](https://pixabay.com/sound-effects/) / Freesound | CC0 | optional pop/ping (add files to `public/sounds/`) |

All URLs live in `src/config/media.ts`; credits render in the footer and on `/policies#credits`.

## Future improvements

Cloudinary signed uploads · Socket.IO transport option · GSAP/Lenis landing polish · Moments photo wall · voice notes with transcripts · "On this day" memories · i18n · PWA push · list virtualization for very long feeds · OAuth providers · 2FA · Redis rate limits · image hashing for abuse detection.

## License

MIT — see `LICENSE`. Demo content is fictional and provided for development only.
