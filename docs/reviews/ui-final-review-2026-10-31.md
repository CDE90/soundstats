# Final redesign UI review · 31 October 2026

**Resolution update (1 Nov 2026):** The four findings and the development migration prerequisite below are resolved. See [the fixes and verification record](ui-release-fixes-2026-11-01.md). This document preserves the original observations.

Reviewed commit `29f4385` in the running local app. **Recommendation: finish the four findings below and apply the import migration before deployment sign-off.** The visual direction is cohesive and the recent navigation/loading fixes hold up. Remaining concerns are specific data-consistency, contrast and keyboard behaviors.

This pass changed no application source. It produced this report and evidence images. Under the earlier authorization to populate preview data through today, the existing synthetic dataset was extended by 167 marked listens through 31 October: 5,517 sample rows total, with no future timestamps. The 33,048 unmarked history rows remain present. No account settings, friendships, invites or uploads were committed; the import migration was not applied.

## Coverage and method

Used the shared browser with the existing authenticated profile and a separate signed-out profile. Checked 1440px desktop and 390px/320px phone layouts, including Default light and dark. Restored the authenticated profile's original dark theme. Development overlays and transient hot-reload console messages are excluded from product findings.

| Area                    | Checks                                                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home and authentication | Phone light layout, album shelf, import FAQ expansion/link, signed-out navigation and Escape/focus return. Signed-out Dashboard reaches the hosted Clerk sign-in with the correct dashboard return destination.                                                                                 |
| Dashboard               | Own populated periods, Today/hourly chart, Last 7 days, friend historical context, visible range, historical streak wording, date picker and dismissal, no document overflow. Recorded the real date transition frame by frame.                                                                 |
| Music details           | Friend artist → track → album destinations; listener identity, date/user parameters, matching Spotify links, return destination and readable average-listen duration. Phone artist/track at 390px and album at 320px.                                                                           |
| Leaderboard             | Current populated streak rows and date-preserving destinations; phone row layout; one-page pagination; keyboard activation of disabled Next. Zero/sparse streaks covered by fresh automated regressions.                                                                                        |
| Feed                    | Populated 24-hour activity, listener identities and external/internal music links, quiet live state, staged people filter and empty-selection state shared by recent/live panels. Phone order and desktop no-selection layout.                                                                  |
| Friends and invites     | Friend list, removal dialog opened/dismissed without removal, cancel-first focus, search loading, friend-of-friend self state, limited-invite blank validation, management list, own/anonymous invite landing and unavailable invite recovery. No social mutations or valid invite submissions. |
| Import                  | Phone/desktop chooser, local file selection/name/removal without upload, overwrite warning in both themes, keyboard tab sequence and failed durable-history request.                                                                                                                            |
| Admin                   | Overview, Users, Invites, Friends and analytics surfaces. At 320px, verified no document overflow, a focusable horizontal table region, explicit search name and person/setting switch names. Viewed current activity and growth analytics. No admin mutations.                                 |
| Other                   | Privacy/Terms contact destinations, account profile modal without changes, playback diagnostics idle state, dashboard access denial and missing-page recovery.                                                                                                                                  |

Fresh automated checks: **64 Node/PostgreSQL regressions, 12 Chromium component interactions and one production Next routing regression all pass, with no skips.** These do not override the manual findings: the current suites do not cover all summary-badge contrast, native tab order, disabled-link activation or post-ingestion cache-consistency cases.

The production navigation test uses deterministic account/query boundaries. The separate local-app date change used the actual authenticated app: **1,665 sampled frames, zero route/chart-loader frames, and two complete summary states** (old → new), with pending feedback and focus returning to the date trigger. This confirms the reported loading flash is fixed for the checked transition; it does not imply every future network/device condition is covered.

## FR-01 · P1 · Independently cached results can contradict each other after history changes

**Observed in the browser, then correlated with source.** The initial dashboard cached a 0-day current streak before the sample history was extended. After appending the missing days, `/dashboard?from=2026-10-31&to=2026-10-31` showed **98 minutes listened today and a 0-day overall streak**, while its own artist streak rows showed **35-day streaks** and the leaderboard showed the same listener at **35 days / Played today**. Reloading/navigating between periods did not immediately reconcile the values.

This reproduction deliberately changed marked development history while the app was running. It demonstrates cache freshness, rather than incorrect streak arithmetic. The background processing service also writes history outside the dashboard request, so the same consistency boundary needs verification after real ingestion/import completion. Do not treat the sample-data refresh alone as proof of a production incident.

At the end of the review the local server was restarted to clear the stale preview caches. The overall streak then read 35 days. This is a preview workaround and helps confirm the cache diagnosis; it does not satisfy the acceptance check below.

The new `Promise.all` coordinates when sections appear, but those sections still resolve independent cache entries. `OverallListeningStreak` and `GenericStreaks` use `cacheLife("hours")`; the default profile used by other reporting functions revalidates at 120 seconds; the leaderboard reads current streaks directly. No visible as-of/freshness indicator explains the mismatch.

**Fix/acceptance:** Establish one explicit freshness/invalidation policy for a listener's current reports. After ingestion/import, current summary, streak rows and leaderboard must reconcile without restarting the web process. If delayed updates are intentional, show a meaningful data-update time and provide an effective refresh path. Keep the corrected atomic date transition. Test by warming caches, adding a qualifying listen across a streak boundary, then navigating/refreshing without clearing the server manually.

**Locations:** `apps/web/src/app/dashboard/_components/listening-streaks.tsx:33` and `:71`; `apps/web/next.config.js:10`; `apps/web/src/app/leaderboard/_components/leaderboard-data-fetcher.tsx:97`; background writes in `apps/service/src/tasks/process-uploads.ts`.

[Cached dashboard summary](ui-final-review-2026-10-31-assets/dashboard-light-stale-summary.png) · [Fresh leaderboard streak](ui-final-review-2026-10-31-assets/leaderboard-streak-mobile.png)

## FR-02 · P2 · Summary percentage badges fail light-mode text contrast

**Observed and measured.** On the Today dashboard in Default light, the 12px positive-change percentages use `rgb(22,163,74)` (`text-green-600`). Their 10% green badge background composites over the metrics panel's `rgb(223,231,251)` to approximately `rgb(203,224,233)`. The resulting text contrast is **2.42:1**, below 4.5:1. These small percentages are visibly faint even though the surrounding summary values are readable.

The top-level `PercentageBadge` also exposes an absolute percentage with an unnamed arrow, unlike the descriptive accessible labels on the newer `ListeningChange` component. A screen-reader user is not given the same explicit increase/decrease meaning.

**Fix/acceptance:** Use theme-aware positive, negative and neutral foregrounds that reach 4.5:1 on the actual badge/panel backgrounds. Include direction and previous-period meaning in the accessible label. Check all three states in both Default themes; add a contrast regression using `PercentageBadge` in its real summary-panel context, not only the chart/error fixtures.

**Location:** `apps/web/src/components/percentage-badge.tsx:14`.

[Light summary badges](ui-final-review-2026-10-31-assets/dashboard-light-stale-summary.png)

## FR-03 · P2 · Disabled leaderboard pagination remains an active link

**Browser + source.** With three listeners and one results page, Previous and Next both have `aria-disabled="true"`, but retain normal opacity, a pointer cursor, `tabIndex=0` and live `href` destinations. Next points to `page=2`. Focusing Next and pressing Enter triggered navigation, which the server clamped back to `page=1`. It is not a useful next page, and the visual/keyboard affordance conflicts with the declared disabled state.

**Fix/acceptance:** Hide pagination when it adds no navigation, or render unavailable controls as clearly disabled, non-interactive elements. Neither pointer nor keyboard activation should navigate to an unavailable page or `#`. Verify first/last boundaries, a single page and an empty leaderboard; valid adjacent pages must remain accessible.

**Locations:** `apps/web/src/app/leaderboard/_components/pagination.tsx:62` and `:87`; shared link rendering in `apps/web/src/components/ui/pagination.tsx:49`; clamp redirect in `apps/web/src/app/leaderboard/page.tsx:243`.

## FR-04 · P2 · Import has an invisible extra keyboard stop

**Reproduced with real Tab navigation.** On `/import`, focus the final instruction link, “Go to your dashboard,” then press Tab. Focus moves to the native file input, whose computed clip is `rect(0px, 0px, 0px, 0px)` and width is 1px. There is no visible focus target. A second Tab reaches the visible “Choose JSON files” button. The hidden input and visible proxy create two chooser stops.

**Fix/acceptance:** Remove the hidden native input from the sequential tab order when the visible button is the selection control, or make the native input visibly usable on focus. The visible chooser should remain named, visibly focusable and able to open the native chooser with Enter/Space. Verify forward/backward Tab navigation, selection, cancellation and removal on mobile/desktop.

**Location:** `apps/web/src/app/import/_components/import-files.tsx:103` through `:122`.

[Mobile chooser and selection](ui-final-review-2026-10-31-assets/mobile-file-selection.png)

## Deployment prerequisite · Import migration is still unapplied in the preview database

The import page reaches its recoverable “Your import history couldn’t load” state. A read-only schema check confirmed that `streaming_uploads` lacks all three new fields: `processing_started_at`, `imported_from` and `imported_to`. `getImportJobs` selects those fields, so Refresh status cannot recover until the environment is upgraded.

This is an outstanding deployment prerequisite already documented in the previous handoff, not a new visual redesign defect. **Apply `pnpm db:migrate` with the intended database configuration before deploying the updated web and service.** Apply it in preview/staging as well, then verify durable queued/processing/completed/failed states and retry against an actual disposable import. The 77 automated checks passed against isolated fixtures; they do not establish that this app database is ready.

**Locations:** `apps/web/src/server/import-job-queries.ts:17`; `packages/database/drizzle/0000_import_job_progress.sql`; [migration instructions](../../packages/database/drizzle/README.md).

[Actual preview import failure](ui-final-review-2026-10-31-assets/import-history-error.png)

## What is ready, and remaining limits

The new typography/surfaces read as one product. Current owner context and detail return links are clear; historical date/streak labels are accurate; the calendar works at narrow widths; the duplicate chart disclosure is gone; populated feed rows, staged filtering and no-selection recovery are understandable; invite owner/anonymous states now offer appropriate actions; legal contact links and idle diagnostics are useful. The sampled layouts had no document-level horizontal overflow; admin tables use their intended local scroll region. [Example friend detail](ui-final-review-2026-10-31-assets/friend-detail-mobile.png).

Still outside this pass: physical-device/on-screen-keyboard and screen-reader sessions, all optional colour presets, a live populated Spotify playback response, actual social success/error mutations, an actual uploaded/processed file, full OAuth completion and deliberate throttled-network failure of every route. No fresh claim is made about those end-to-end outcomes. The review used CSS viewport resizing rather than a mobile user-agent/device emulator. Existing focused fixtures exercise several corresponding action and error contracts.

After the prerequisite and four findings are resolved, rerun their acceptance checks and the current 77 regressions. A complete second visual redesign is not indicated by this pass.
