import { db } from "@/server/db";
import { listeningHistory, users } from "@/server/db/schema";
import { type clerkClient } from "@clerk/nextjs/server";
import { and, gte, lte } from "drizzle-orm";
import "server-only";

export interface DateRange {
    from: Date;
    to: Date;
}

export function getTimeFilters(dateRange: DateRange) {
    const timeFilters = and(
        gte(listeningHistory.playedAt, dateRange.from),
        lte(listeningHistory.playedAt, dateRange.to),
    );

    return timeFilters;
}

export async function setUserTracking(
    enabled: boolean,
    userId: string,
    spotifyId: string,
) {
    "use server";

    const dbUsers = await db
        .insert(users)
        .values({
            id: userId,
            spotifyId: spotifyId,
            premiumUser: false,
            enabled,
        })
        .onConflictDoUpdate({
            target: users.id,
            set: { enabled },
        })
        .returning();

    return dbUsers[0]!;
}

type ClerkClient = Awaited<ReturnType<typeof clerkClient>>;

export async function getSpotifyToken(apiClient: ClerkClient, userId: string) {
    const clerkTokenResponse = await apiClient.users.getUserOauthAccessToken(
        userId,
        "oauth_spotify",
    );

    if (!clerkTokenResponse.data) {
        return null;
    }

    const data = clerkTokenResponse.data[0]!;
    const accessToken = data.token;

    return accessToken;
}

export async function getSpotifyAccount(
    apiClient: ClerkClient,
    clerkUserId: string,
) {
    const userResponse = await apiClient.users.getUser(clerkUserId);

    const spotifyAccounts = userResponse.externalAccounts.filter(
        (account) => account.provider === "oauth_spotify",
    );

    if (!spotifyAccounts.length) {
        return null;
    }

    return spotifyAccounts[0]!;
}
