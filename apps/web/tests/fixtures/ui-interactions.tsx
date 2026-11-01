import { createRoot } from "react-dom/client";
import { NavBar } from "../../src/components/ui-parts/NavBar";
import { DateSelector } from "../../src/components/ui-parts/DateSelector";
import { ListenerContext } from "../../src/components/listener-context";
import { PlaytimeChart } from "../../src/components/ui-parts/PlaytimeChart";
import { MusicCollection } from "../../src/components/music-collection";
import { UsersTable } from "../../src/app/admin/_components/users-table";
import { UserSearch } from "../../src/app/friends/_components/user-search";
import { CreateInviteForm } from "../../src/app/invite/_components/create-invite-form";
import { InviteList } from "../../src/app/invite/_components/invite-list";
import {
    FriendCard,
    FriendRequestCard,
    PendingRequestCard,
} from "../../src/app/friends/_components/friend-list";
import { ImportFiles } from "../../src/app/import/_components/import-files";
import { ImportHistory } from "../../src/app/import/_components/import-history";
import { FriendsFilter } from "../../src/app/feed/friends-filter";
import { RecentListens } from "../../src/app/feed/recent-listens";
import type { RecentListen } from "../../src/app/feed/actions";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import { Button } from "../../src/components/ui/button";
import { applyTheme } from "../../src/lib/colorswitchcn/fix-global-css";
import { defaultThemeState } from "../../src/lib/colorswitchcn/theme-presets";
import { importJobSummary } from "../../src/lib/import-history";
import { Toaster } from "sonner";

import { PercentageBadge } from "../../src/components/percentage-badge";
import LeaderboardPagination from "../../src/app/leaderboard/_components/pagination";
import {
    PaginationPrevious,
    PaginationNext,
} from "../../src/components/ui/pagination";

declare global {
    interface Window {
        __disabledPaginationClicks?: number;
    }
}

const range = {
    from: new Date("2026-09-01Z"),
    to: new Date("2026-10-17T23:59:59.999Z"),
};
const params = new URLSearchParams(location.search);
const fixture = params.get("fixture");
const currentPage = Number(params.get("page") ?? 1);
const totalPages = Number(params.get("pages") ?? 3);
const friend = {
    relationshipId: 1n,
    userId: "friend",
    name: "Friend",
    initiatedByMe: false,
    createdAt: new Date("2026-01-01Z"),
};
const listens: RecentListen[] = Array.from({ length: 10 }, (_, index) => ({
    id: String(index),
    userId: "friend",
    user: "Friend",
    trackId: "track",
    song: `Song ${index}`,
    artist: "Artist",
    timestamp: Date.now(),
}));
const jobs = ["queued", "processing", "completed", "failed"].map((state) =>
    importJobSummary({
        id: BigInt(
            ["queued", "processing", "completed", "failed"].indexOf(state),
        ),
        fileName: `${state}.json`,
        processed: state === "completed",
        invalidFile: false,
        failedAt: state === "failed" ? new Date() : null,
        processedAt: state === "completed" ? new Date() : null,
        processingStartedAt: state === "processing" ? new Date() : null,
        nextRetryAt: null,
        importedFrom: new Date("2024-01-01Z"),
        importedTo: new Date("2024-12-31Z"),
        createdAt: new Date(),
        updatedAt: null,
        storageDeletedAt: null,
    }),
);
createRoot(document.getElementById("root")!).render(
    <div className="site-shell sound-design">
        <h1 className="sr-only">SoundStats interaction fixtures</h1>
        {fixture === "navigation" ? (
            <NavBar />
        ) : (
            <main id="main-content" className="ss-page">
                {fixture === "dates" && (
                    <DateSelector
                        baseUrl={location.origin}
                        startDate={range.from}
                        endDate={range.to}
                        dataStartDate={new Date("2020-01-01Z")}
                    />
                )}
                {fixture === "context" && (
                    <>
                        <ListenerContext
                            user={{ username: "Friend" }}
                            isViewer={false}
                        />
                        <MusicCollection
                            label="Streaks"
                            context={{ userId: "friend", dateRange: range }}
                            layout="list"
                            items={[
                                {
                                    id: "artist",
                                    type: "artist",
                                    name: "An artist",
                                    imageUrl: null,
                                    streak: { days: 21, extendedToday: true },
                                },
                            ]}
                        />
                    </>
                )}
                {fixture === "chart" && (
                    <PlaytimeChart
                        dailyPlaytime={[
                            { date: "2026-10-17", playtime: 120 },
                            { date: "2026-10-18", playtime: 60 },
                        ]}
                        prevDailyPlaytime={[
                            { date: "2026-10-17", playtime: 180 },
                            { date: "2026-10-18", playtime: 0 },
                        ]}
                    />
                )}
                {fixture === "admin" && (
                    <UsersTable
                        users={[
                            {
                                id: "user",
                                firstName: "Listener",
                                spotifyId: "spotify",
                                enabled: true,
                                premiumUser: false,
                                isAdmin: false,
                                createdAt: new Date("2026-01-01Z"),
                                updatedAt: null,
                            },
                        ]}
                    />
                )}
                {fixture === "search" && <UserSearch />}
                {fixture === "invite" && <CreateInviteForm />}
                {fixture === "invite-list" && (
                    <InviteList
                        invites={[
                            {
                                id: 1n,
                                code: "TEST1234",
                                name: "Friends",
                                status: "active",
                                maxUses: null,
                                currentUses: 0,
                                expiresAt: null,
                                createdAt: new Date(),
                            },
                        ]}
                    />
                )}
                {fixture === "friends" && (
                    <>
                        <section aria-label="Accepted friend">
                            <FriendCard friend={friend} />
                        </section>
                        <section aria-label="Incoming request">
                            <FriendRequestCard request={friend} />
                        </section>
                        <section aria-label="Outgoing request">
                            <PendingRequestCard request={friend} />
                        </section>
                    </>
                )}
                {fixture === "import" && (
                    <>
                        <a href="#chooser-after">Before file chooser</a>
                        <ImportFiles onUploaded={async () => {}} />
                        <a id="chooser-after" href="#root">
                            After file chooser
                        </a>
                    </>
                )}
                {fixture === "history" && (
                    <ImportHistory
                        jobs={jobs}
                        loading={false}
                        error={null}
                        refresh={async () => {}}
                    />
                )}
                {fixture === "feed" && (
                    <>
                        <FriendsFilter
                            friends={[{ userId: "friend", name: "Friend" }]}
                            currentUserId="self"
                            currentUserName="Listener"
                        />
                        <RecentListens
                            initialState={listens}
                            selectedUserIds={["self", "friend"]}
                            friendCount={1}
                        />
                    </>
                )}
                {fixture === "summary-badges" && (
                    <>
                        <Button
                            onClick={() =>
                                applyTheme({
                                    ...defaultThemeState,
                                    currentMode: "light",
                                })
                            }
                        >
                            Light theme
                        </Button>
                        <Button
                            onClick={() =>
                                applyTheme({
                                    ...defaultThemeState,
                                    currentMode: "dark",
                                })
                            }
                        >
                            Dark theme
                        </Button>
                        <section
                            className="ss-metrics"
                            aria-label="Listening summary"
                        >
                            {[
                                [
                                    12.3,
                                    "minutes listened",
                                    "Minutes listened",
                                    "98",
                                ],
                                [
                                    -4.5,
                                    "artists explored",
                                    "Artists explored",
                                    "12",
                                ],
                                [
                                    0,
                                    "different tracks",
                                    "Different tracks",
                                    "25",
                                ],
                            ].map(([change, metric, label, value]) => (
                                <div className="ss-metric" key={metric}>
                                    <span className="ss-metric-label">
                                        {label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <p className="ss-metric-value">
                                            {value}
                                        </p>
                                        <PercentageBadge
                                            percentChange={Number(change)}
                                            metric={String(metric)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </section>
                    </>
                )}
                {fixture === "pagination" && (
                    <>
                        <Button>Before pagination</Button>
                        <LeaderboardPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            getPageUrl={(page) =>
                                `/?fixture=pagination&page=${page}&pages=${totalPages}`
                            }
                        />
                        <Button>After pagination</Button>
                    </>
                )}
                {fixture === "pagination-shared" && (
                    <>
                        <Button>Before pagination</Button>
                        <PaginationPrevious
                            href="/unavailable-previous"
                            aria-disabled="true"
                            onClick={() => {
                                window.__disabledPaginationClicks =
                                    (window.__disabledPaginationClicks || 0) +
                                    1;
                            }}
                        />
                        <PaginationNext
                            href="/unavailable-next"
                            disabled
                            onClick={() => {
                                window.__disabledPaginationClicks =
                                    (window.__disabledPaginationClicks || 0) +
                                    1;
                            }}
                        />
                        <Button>After pagination</Button>
                    </>
                )}
                {fixture === "errors" && (
                    <>
                        <Button
                            onClick={() =>
                                applyTheme({
                                    ...defaultThemeState,
                                    currentMode: "light",
                                })
                            }
                        >
                            Light theme
                        </Button>
                        <Button
                            onClick={() =>
                                applyTheme({
                                    ...defaultThemeState,
                                    currentMode: "dark",
                                })
                            }
                        >
                            Dark theme
                        </Button>
                        <div className="bg-card p-4">
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Import replaces history in this file’s date
                                    range.
                                </AlertDescription>
                            </Alert>
                            <p className="text-destructive">An inline error.</p>
                            <Button variant="destructive">Remove friend</Button>
                        </div>
                    </>
                )}
            </main>
        )}
        <Toaster />
    </div>,
);
