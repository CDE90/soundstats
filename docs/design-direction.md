# SoundStats redesign: first pass

Scope: all SoundStats pages and shared interface components. Use Anthropic's frontend-design skill; retain authentication, queries, date filtering, theme mode, account controls, Spotify attribution, and existing detail links.

Audience: people who care about the music behind their listening numbers. The home page invites them into their collection; the dashboard makes their listening activity and rotation easy to read.

## Tokens

- Ice `#F1F5FC`: page background.
- Ink `#172B50`: primary text.
- Cobalt `#3155D9`: actions and current-period activity.
- Periwinkle `#DFE7FB`: collection surface and summary band.
- Slate `#596B87`: supporting text.
- White `#FFFFFF`: chart surface.

Existing PP Gosha Sans gives headings the personality of a record sleeve. Geist provides quiet body text and readable data. Use proportional, tabular numerals for metrics. Dark mode uses the same blue relationships, with dark blue surfaces and lighter text.

## Layout

Left align content within a 1240px container. Let the home headline and an intact, labelled album shelf share the opening. The dashboard has a compact title/date row, a continuous metric band, then activity, rankings, and visible listening streaks.

```text
Home                          Dashboard
[brand | navigation | user]   [brand | navigation | user]
[large headline | albums]     [title          | date picker]
[actions        | albums]     [minutes | artists | tracks | streak]
[activity / rankings / friends][listening activity             ]
[questions             ]     [artists | tracks | albums        ]
[compact footer        ]     [artist | track | album streaks    ]
```

On mobile, stack the hero and album shelf, use two columns for summary metrics, and use two cards per row or a compact list, according to the saved dashboard view. Navigation becomes a labelled menu button.

## Review before implementation

An initial idea used a dark record-player panel and floating statistics. Replaced that with an open, pale blue album shelf: the former would lean on generic dark music-app styling and decorative UI. The bold gesture is the large Gosha headline; artwork stays unaltered and all other UI remains restrained. Ranks describe actual order; no decorative numbering, uppercase eyebrows, gradients, or repeated feature-card containers.

## Quality floor

Keep full Spotify artwork, matching external links, and supplied logo assets. Preserve auth and data access boundaries. Verify desktop/mobile layouts, dark mode, keyboard focus, date controls, FAQ/menu interaction, and meaningful empty states. The user approved the initial home/dashboard direction and requested the same treatment across the remaining pages.

## Implemented and checked

Home and dashboard now share the blue palette, Gosha display typography, compact navigation, and footer. The dashboard preserves its existing authentication and queries, supports date filtering and Spotify/detail links, and includes matching loading and empty states. The proposed palette is the global default preset in light and dark mode. The existing colour picker remains available on every page, and the redesigned pages and their dropdowns/calendar inherit the selected preset. Typography is fixed to Geist for body text and Gosha for display headings; the font selector and saved font preference have been removed.

Album examples are unaltered Spotify artwork retrieved through Spotify oEmbed, stored in `apps/web/public/design-artwork`, and linked to the matching albums. Supplied Spotify wordmarks are reused directly.

Validation: web TypeScript and ESLint checks; desktop, tablet, and phone browser layouts; light/dark mode; keyboard focus and skip link; mobile navigation; FAQs; date preset selection and application; populated and empty listening periods; visible artist, track, and album streaks.

Local review: `http://localhost:3000/` and `http://localhost:3000/dashboard`. A populated historical dashboard can be viewed with `?from=2024-01-01&to=2024-12-31`. Start with `DISABLE_REACT_SCAN=1 pnpm --filter @soundstats/web dev` to keep the performance overlay out of the review.

## Whole-app continuation

Apply the accepted type, spacing, surfaces, and selectable palette across the leaderboard, social pages, invites, imports, artist/album/track details, legal documents, diagnostics, and administration. Shared page headings and loading states keep the navigation consistent. The feed uses separate activity rows and a live-listening sidebar; music details lead with intact artwork and one summary band; import uses an actual three-step process beside the uploader; legal pages use a readable document column and section navigation. Tables remain scrollable on small screens. All existing authentication and action handlers remain in place.

The floating now-playing widget has been restored to its pre-redesign implementation at the user’s request, including its compact layout, artwork-derived gradient, progress bar, and minimise/restore behavior. Error and missing-page states use the redesigned interface.

Final continuation checks: remaining routes rendered at 1440px and 390px, with additional 320px checks for narrow layouts. Verified friend search with no results, friend and discovery views, invite form fields and management tabs, existing valid/invalid invite pages, leaderboard period selection, artist/track/album links and artwork, admin tabs, selectable palettes, dark calendar surfaces, and keyboard focus. No account, invite, friend, or upload mutations were performed during preview checks.

Web TypeScript, ESLint, and whitespace checks passed. Music detail tests passed 3 checks; 5 PostgreSQL integration checks were skipped because a test database was not configured. Fixed the feed's request-header access inside a cache scope by keeping cached listening queries separate from profile lookups. Added local loading boundaries for dynamic friend pages so their navigation streams correctly.


## Review refinements, 17 October 2026

Rechecked [Spotify’s design guidelines](https://developer.spotify.com/documentation/design). They require clear Spotify branding with metadata/artwork and links back to matching content. They describe attribution of a content set; they do not specify a logo on every table row. Keep one full wordmark per music section and intact artwork. The main card or row opens SoundStats details; a separate accessible external-link button opens the matching Spotify entity. Use supplied assets unchanged, with a minimum 70px full wordmark or 21px icon. This avoids repeated row logos while retaining attribution and direct destinations.

Streaks remain visible as a section, with Artists / Tracks / Albums category buttons. They reuse the ranking row so internal links carry the same user and UTC calendar range. The dashboard date picker also uses UTC, matching detail pages and streak calculations. Tables share lighter headings, aligned numeric columns, row separators, and focus/hover states. Recent listens separate their date and time for easier scanning. Feed activity and leaderboard entries with no first name use their existing username or “Listener”; email addresses are not used as their display-name fallback.

Dashboard and music detail charts share SQL aggregation: hourly for one day, daily through 60 days, weekly through 366 days, monthly through eight years, then yearly. Empty buckets remain zero. Previous-period activity is shifted by the exact period duration before grouping, so both series use identical bucket boundaries and retain totals even across partial weeks and unequal months. Axes use regular whole minute/hour steps and readable date/time labels, with date ticks on six-hour, weekly, quarter, or half-year boundaries as appropriate. Durations display hours and minutes, without seconds.

The requested local preview dataset contains 4,240 marked listens across the current account and its two accepted friends, from 21 August through 17 October 2026. The accounts have current streaks of 21, 14, and 9 days. Existing listening history, accounts, friendships, and catalogue metadata were preserved. Added rows use `device_type = synthetic-preview`, an owner-specific `device_name`, and `imported = true`. They are historical sample plays and do not fabricate a live Spotify playback session.

The seeder is transactional and idempotent. From `apps/web`, run a read-only summary using the account’s Clerk ID:

```sh
node --env-file=.env scripts/seed-preview-history.mjs --user <Clerk-user-ID>
```

Append `--apply` to seed, or `--remove` to remove only that seed’s marked rows. The removal command does not delete real history. Repeating `--apply` was verified to leave the dataset unchanged. Verified all sample durations are within track lengths, at least 30 seconds, and none of the timestamps is in the future.

Validation: TypeScript and ESLint passed; 6 chart utility tests and 11 music-detail/query tests passed, including PostgreSQL integration tests against a separate disposable database. Tests cover aggregation thresholds, zero filling, UTC boundaries in a non-UTC database session, whole-minute ticks, preservation of totals and comparison alignment. Browser checks covered 1440px and 390px, light/dark surfaces, Today/hourly and long-history graphs, visible streak links into artist/track/album pages, populated feed and three-person leaderboard. The preview server remains on port 3000.


## Adopted list layouts

The dashboard uses Cards for rankings and List for streaks by default. Each section has Artists / Tracks / Albums category buttons and independent Cards / List controls; the two layout preferences are saved in this browser. There are no item-count badges beside headings or instructions explaining navigation.

Music cards and rows have one main internal link covering their artwork, title, metrics, and whitespace. A separate external-link button opens the matching Spotify entity. The two anchors are siblings; the Spotify button has its own focus target, tooltip, rounded hover background, and no artwork overlay. A shared component keeps this behavior consistent across rankings, streaks, and detail-page top tracks.

The leaderboard uses rows with stable metric placement, emphasis on the selected metric, an unobtrusive You label, and one main link into the listener’s dashboard. A right-facing chevron conveys internal navigation; it shares the rounded hover feedback of other icon actions. Sorting, direction, timeframes, comparison metrics, and pagination remain available. Rows reflow on phones instead of scrolling horizontally.

Artist and album pages show a full-width listening chart, matching top-track cards, and recent listens as a chronological list. Track pages retain their chart and recent listens. Timestamps move above track names on narrow screens. Date and user context follow every internal music link. View controls are restricted to the dashboard.

The initial comparison route now redirects to the implemented dashboard. The prototype was retained locally under the ignored `tmp` directory. Removed obsolete table and streak-tab components and their unused CSS.

Validation for this continuation: repository-wide type checking and ESLint; 6 chart tests and 11 music-detail/query tests, including the disposable PostgreSQL suite; desktop, 390px, and 320px browser layouts; independent layout persistence across reloads and friend dashboards; category keyboard navigation; internal artwork/card destinations; separate matching Spotify targets; rounded hover feedback; dark theme; populated and empty periods. No account or listening-history mutations were needed for these layout changes.


## Interface polish

List-row hover backgrounds and internal hit areas extend to the panel edges, with rounded first/last rows and inset dividers. The leaderboard direction control matches its selectors in height, outline, surface, and alignment, and stays beside the ranking selector on phones.

Friends and invite content use the same page width as their loading states and the other main pages. Tabs wrap when necessary without scroll containers; compact spacing keeps the three friend tabs on one row at 320px. Typography is fixed to the approved Gosha/Geist mix; the obsolete font selector, provider, and stored preference are removed. Colour themes and light/dark mode remain available.

Recent feed activity and live-listening music use internal track links for artwork and metadata, with a separate matching Spotify icon action. Recent-listen links carry the listening user's ID, so a friend's play opens that friend's statistics. Live-listening profile links remain available. Timestamps retain their keyboard-accessible full-date tooltips.

Validation: repository-wide TypeScript and ESLint; browser checks at 1440px, 390px, and 320px, in light and dark mode. Checked row edge hit targets and rounded hover coverage, matching filter geometry, sort direction navigation, tab overflow and keyboard movement, content widths, internal feed destinations for self/friend listens, Spotify icon hover/focus feedback, and the empty feed. Live Spotify playback was empty during this check; its populated rendering was reviewed in code. No account, friend, invite, or listening-history data was changed.


## Review corrections

Addressed CodeRabbit's ten distinct findings (eleven threads, including a duplicate report about null track IDs). Local Spotify tracks retain their artwork and metadata without internal or external music links when no catalogue ID exists. The listener model makes the ID optional and no longer uses a type assertion to hide missing IDs. Recent activity and leaderboard entries fall back to “Listener” rather than an email address.

Leaderboard row links expose their visible rank, metrics, and played-today status through their accessible name. Dashboard loading has the same status role as other loading states; invite copy/toggle/delete labels identify the invite code. The feed's none-selected state counts zero people, the privacy navigation uses a literal apostrophe, and unchanged listening percentages have grammatical labels. The preview seeder rejects missing or blank database configuration before constructing a client.

Validation: `pnpm check`; four new rendering/configuration tests (`test:ui-review`), six chart tests, and three music-detail tests passed. Eight database integration tests were skipped without a test database; the changes do not modify database queries. Browser checks verified the zero/single-person feed descriptions, generic name fallback for an existing profile lacking a first name/username, invite labels, the privacy link, and the leaderboard accessibility tree. No account, friendship, invite, or listening-history mutations were performed.
