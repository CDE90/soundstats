import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { ChevronRight, Flame } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListeningChange } from "@/components/listening-change";
import { EmptyState } from "@/components/page-layout";
import { formatListeningDuration } from "@/lib/listening-chart";
import type { LeaderboardUserData, SortBy } from "./leaderboard-data-fetcher";
import styles from "./leaderboard-list.module.css";

export async function LeaderboardList({
    userComparisons,
    sortBy,
    viewerId,
    startRank = 1,
}: {
    userComparisons: LeaderboardUserData[];
    sortBy: SortBy;
    viewerId: string;
    startRank?: number;
}) {
    if (!userComparisons.length)
        return <EmptyState title="No listening in this period." />;
    const client = await clerkClient();
    const { data: profiles } = await client.users.getUserList({
        userId: userComparisons.map((person) => person.userId),
        limit: userComparisons.length,
    });
    return (
        <ol
            className={styles.list}
            start={startRank}
            aria-label="Listening leaderboard"
        >
            {userComparisons.map((person, index) => {
                const profile = profiles.find(
                    (user) => user.id === person.userId,
                );
                const name =
                    profile?.firstName || profile?.username || "Listener";
                return (
                    <li
                        className={styles.person}
                        key={person.userId}
                        data-self={viewerId === person.userId}
                    >
                        <Link
                            className={styles.main}
                            href={`/dashboard?user=${encodeURIComponent(person.userId)}`}
                        >
                            <span className={styles.rank}>
                                <span>
                                    <span className="sr-only">Rank </span>
                                    {String(startRank + index).padStart(2, "0")}
                                </span>
                                <ListeningChange
                                    rank
                                    value={person.rankChange}
                                    previousRank={person.previousRank}
                                />
                            </span>
                            <span className={styles.avatar} aria-hidden="true">
                                {profile?.imageUrl ? (
                                    <Image
                                        src={profile.imageUrl}
                                        alt=""
                                        width={54}
                                        height={54}
                                    />
                                ) : (
                                    name[0]
                                )}
                            </span>
                            <span className={styles.identity}>
                                <span className={styles.name}>{name}</span>
                                {viewerId === person.userId && (
                                    <span className={styles.you}>You</span>
                                )}
                            </span>
                            <dl className={styles.metrics}>
                                <div data-active={sortBy === "Playtime"}>
                                    <dt>Listening time</dt>
                                    <dd>
                                        {formatListeningDuration(
                                            person.playtime ?? 0,
                                        )}
                                    </dd>
                                    {sortBy === "Playtime" && (
                                        <ListeningChange
                                            value={person.percentChange}
                                            unit="listening time"
                                        />
                                    )}
                                </div>
                                <div data-active={sortBy === "Count"}>
                                    <dt>Plays</dt>
                                    <dd>
                                        {(person.count ?? 0).toLocaleString()}
                                    </dd>
                                    {sortBy === "Count" && (
                                        <ListeningChange
                                            value={person.percentChange}
                                        />
                                    )}
                                </div>
                                <div data-active={sortBy === "Streak"}>
                                    <dt>Streak</dt>
                                    <dd>
                                        <Flame size={14} aria-hidden="true" />
                                        {person.streak ?? 0}
                                        <small>days</small>
                                    </dd>
                                    <span className={styles.status}>
                                        {person.streakIsExtendedToday
                                            ? "Played today"
                                            : "Not played today"}
                                    </span>
                                </div>
                            </dl>
                            <span
                                className={`ss-icon-link ${styles.chevron}`}
                                aria-hidden="true"
                            >
                                <ChevronRight size={18} />
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ol>
    );
}
