import type { RecentListen } from "./actions";

/** One allow-listed selection is used by the heading, recent plays and live plays. */
export function getFeedScope(
    filter: string | null | undefined,
    validUserIds: readonly string[],
) {
    const validIds = [...new Set(validUserIds)];
    const requested = filter
        ? new Set(filter.split(",").filter(Boolean))
        : null;
    const userIds = requested
        ? validIds.filter((id) => requested.has(id))
        : validIds;
    return {
        userIds,
        key: [...userIds].sort().join(",") || "__none__",
        isFiltered: userIds.length < validIds.length,
    };
}

export function getFeedEmptyState(selectedCount: number, friendCount: number) {
    if (selectedCount === 0) {
        return {
            title: "No people selected.",
            description:
                "Choose people in the filter to see their listening activity.",
            action: "Show everyone",
            href: "/feed",
        };
    }
    if (friendCount === 0) {
        return {
            title: "No plays in the last 24 hours.",
            description:
                "Your recent listening will appear here. Add friends to share what’s playing.",
            action: "Find friends",
            href: "/friends",
        };
    }
    return {
        title: "No plays in the last 24 hours.",
        description:
            "The selected people haven’t played anything in this window. Their earlier history is still on their dashboards.",
        action: "Your dashboard",
        href: "/dashboard",
    };
}

export const FEED_PAGE_SIZE = 10;

export interface FeedPageState {
    items: RecentListen[];
    offset: number;
    hasMore: boolean;
    requestId: number | null;
    error: string | null;
}

type FeedPageAction =
    | { type: "start"; requestId: number }
    | { type: "success"; requestId: number; items: RecentListen[] }
    | { type: "error"; requestId: number; message: string };

export function createFeedPageState(
    items: RecentListen[],
    error: string | null = null,
): FeedPageState {
    return {
        items,
        offset: items.length,
        hasMore: !!error || items.length === FEED_PAGE_SIZE,
        requestId: null,
        error,
    };
}

/** Late responses cannot replace a newer request or advance a failed page. */
export function feedPageReducer(
    state: FeedPageState,
    action: FeedPageAction,
): FeedPageState {
    if (action.type === "start") {
        if (state.requestId !== null) return state;
        return { ...state, requestId: action.requestId, error: null };
    }
    if (action.requestId !== state.requestId) return state;
    if (action.type === "error") {
        return { ...state, requestId: null, error: action.message };
    }
    const existing = new Set(state.items.map((item) => item.id));
    return {
        items: [
            ...state.items,
            ...action.items.filter((item) => {
                if (existing.has(item.id)) return false;
                existing.add(item.id);
                return true;
            }),
        ],
        offset: state.offset + action.items.length,
        hasMore: action.items.length === FEED_PAGE_SIZE,
        requestId: null,
        error: null,
    };
}
