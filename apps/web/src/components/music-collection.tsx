import Image from "next/image";
import Link from "next/link";
import { Check, Flame, Music2 } from "lucide-react";
import { SpotifyLink } from "@/components/spotify-link";
import { ListeningChange } from "@/components/listening-change";
import { Skeleton } from "@/components/ui/skeleton";
import {
    musicDetailHref,
    type MusicDetailContext,
    type MusicEntityType,
} from "@/lib/music-details";
import { formatListeningDuration } from "@/lib/listening-chart";
import styles from "./music-collection.module.css";

export interface MusicCollectionItem {
    id: string;
    type: MusicEntityType;
    name: string;
    imageUrl: string | null;
    rank?: number;
    plays?: number;
    minutes?: number;
    rankChange?: number | null;
    previousRank?: number | null;
    percentChange?: number | null;
    streak?: { days: number; extendedToday: boolean };
}

export function MusicCollection({
    items,
    context,
    label,
    layout,
    emptyMessage = "No listening in this period.",
}: {
    items: MusicCollectionItem[];
    context: MusicDetailContext;
    label: string;
    layout?: "cards" | "list";
    emptyMessage?: string;
}) {
    if (!items.length) return <p className={styles.empty}>{emptyMessage}</p>;
    return (
        <ol
            className={styles.collection}
            data-layout={layout}
            aria-label={label}
        >
            {items.map((item) => (
                <li
                    className={styles.item}
                    data-ranked={item.rank !== undefined}
                    data-streak={Boolean(item.streak)}
                    key={item.id}
                >
                    <Link
                        className={styles.main}
                        href={musicDetailHref(item.type, item.id, context)}
                        title={`View listening details for ${item.name}`}
                    >
                        <span className={styles.rank}>
                            {item.rank !== undefined && (
                                <span>
                                    <span className="sr-only">Rank </span>
                                    {String(item.rank).padStart(2, "0")}
                                </span>
                            )}
                            <ListeningChange
                                rank
                                value={item.rankChange}
                                previousRank={item.previousRank}
                            />
                        </span>
                        <span className={styles.cover} aria-hidden="true">
                            {item.imageUrl ? (
                                <Image
                                    src={item.imageUrl}
                                    alt=""
                                    width={320}
                                    height={320}
                                    sizes="(max-width: 640px) 45vw, (max-width: 1000px) 30vw, 230px"
                                />
                            ) : (
                                <Music2 size={28} />
                            )}
                        </span>
                        <span className={styles.identity}>
                            <span className={styles.name}>{item.name}</span>
                            {item.streak ? (
                                <span
                                    className={styles.secondary}
                                    data-complete={item.streak.extendedToday}
                                >
                                    {item.streak.extendedToday ? (
                                        <Check size={12} aria-hidden="true" />
                                    ) : (
                                        <Flame size={12} aria-hidden="true" />
                                    )}
                                    {item.streak.extendedToday
                                        ? "Played today"
                                        : "Not played today"}
                                </span>
                            ) : (
                                <span className={styles.secondary}>
                                    {item.minutes !== undefined && (
                                        <span>
                                            {Math.round(
                                                item.minutes,
                                            ).toLocaleString()}{" "}
                                            min listened
                                        </span>
                                    )}
                                    <ListeningChange
                                        value={item.percentChange}
                                    />
                                </span>
                            )}
                        </span>
                        <span className={styles.stat}>
                            {item.streak ? (
                                <>
                                    <span className={styles.streakCount}>
                                        <Flame size={18} aria-hidden="true" />
                                        <strong>{item.streak.days}</strong>
                                    </span>
                                    <span>day streak</span>
                                </>
                            ) : (
                                <>
                                    <strong>
                                        {item.plays?.toLocaleString()}
                                    </strong>
                                    <span>plays</span>
                                </>
                            )}
                        </span>
                    </Link>
                    <SpotifyLink
                        type={item.type}
                        id={item.id}
                        name={item.name}
                        className={styles.source}
                    />
                </li>
            ))}
        </ol>
    );
}

export function MusicCollectionSkeleton({
    count = 5,
    layout,
}: {
    count?: number;
    layout?: "cards" | "list";
}) {
    return (
        <div
            className={styles.collection}
            data-layout={layout}
            aria-hidden="true"
        >
            {Array.from({ length: count }, (_, index) => (
                <div
                    className={`${styles.item} ${styles.skeleton}`}
                    key={index}
                >
                    <div className={styles.main}>
                        <span className={styles.rank}>
                            <Skeleton className="h-4 w-5" />
                        </span>
                        <Skeleton className={styles.cover} />
                        <span className={styles.identity}>
                            <Skeleton className="mb-2 h-4 w-4/5" />
                            <Skeleton className="h-3 w-2/5" />
                        </span>
                        <Skeleton className="h-6 w-12" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ListeningHistory({
    items,
    context,
    showTracks = true,
}: {
    items: {
        id: string;
        trackId: string;
        name: string;
        imageUrl: string | null;
        playedAt: Date;
        progressMs: number;
    }[];
    context: MusicDetailContext;
    showTracks?: boolean;
}) {
    return (
        <ol className={styles.history} aria-label="Recent listens">
            {items.map((item, index) => {
                const newDay =
                    index === 0 ||
                    item.playedAt.toISOString().slice(0, 10) !==
                        items[index - 1]!.playedAt.toISOString().slice(0, 10);
                const content = (
                    <>
                        <time
                            dateTime={item.playedAt.toISOString()}
                            className={styles.playedAt}
                        >
                            <span className={newDay ? undefined : "sr-only"}>
                                {item.playedAt.toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    timeZone: "UTC",
                                })}
                            </span>
                            <span>
                                {item.playedAt.toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "UTC",
                                })}
                                <span className="sr-only"> UTC</span>
                            </span>
                        </time>
                        {showTracks && (
                            <>
                                <span
                                    className={styles.historyCover}
                                    aria-hidden="true"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt=""
                                            width={44}
                                            height={44}
                                        />
                                    ) : (
                                        <Music2 size={18} />
                                    )}
                                </span>
                                <span className={styles.name}>{item.name}</span>
                            </>
                        )}
                        <span className={styles.duration}>
                            {formatListeningDuration(item.progressMs / 1000)}
                            <span>listened</span>
                        </span>
                    </>
                );
                return (
                    <li
                        key={item.id}
                        className={styles.historyItem}
                        data-new-day={newDay}
                        data-track={showTracks}
                    >
                        {showTracks ? (
                            <Link
                                className={styles.historyMain}
                                href={musicDetailHref(
                                    "track",
                                    item.trackId,
                                    context,
                                )}
                            >
                                {content}
                            </Link>
                        ) : (
                            <div className={styles.historyMain}>{content}</div>
                        )}
                        <SpotifyLink
                            type="track"
                            id={item.trackId}
                            name={item.name}
                            className={styles.historySource}
                        />
                    </li>
                );
            })}
        </ol>
    );
}
