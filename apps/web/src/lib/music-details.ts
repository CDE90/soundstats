export type MusicEntityType = "artist" | "track" | "album";

export interface MusicDetailContext {
    userId: string;
    dateRange: { from: Date; to: Date };
}

export function musicDetailHref(
    type: MusicEntityType,
    id: string,
    context: MusicDetailContext,
) {
    return `/${type}s/${encodeURIComponent(id)}?${musicDetailParams(context)}`;
}

export function musicDetailParams({ userId, dateRange }: MusicDetailContext) {
    return new URLSearchParams({
        user: userId,
        from: dateRange.from.toISOString().slice(0, 10),
        to: dateRange.to.toISOString().slice(0, 10),
    }).toString();
}

export function readMusicDetailRange(
    from: string | undefined,
    to: string | undefined,
    now = new Date(),
) {
    const today = new Date(now.toISOString().slice(0, 10));
    const defaultFrom = new Date(today);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

    function readDate(value: string | undefined, fallback: Date) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) &&
            date.toISOString().slice(0, 10) === value &&
            date.getUTCFullYear() >= 1900
            ? date
            : fallback;
    }

    let start = readDate(from, defaultFrom);
    let end = readDate(to, today);
    if (start > end) {
        start = defaultFrom;
        end = today;
    }
    end = new Date(end);
    end.setUTCHours(23, 59, 59, 999);
    return { from: start, to: end };
}

// Keep the permission decision outside data loading so denied requests never
// reach the listening-history queries.
export async function canViewMusicDetails(
    viewerId: string,
    targetUserId: string,
    areFriends: (viewerId: string, targetUserId: string) => Promise<boolean>,
) {
    return viewerId === targetUserId || areFriends(viewerId, targetUserId);
}
