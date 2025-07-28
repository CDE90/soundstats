"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { users, invites, friends } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { checkAdminAccess } from "./check-admin";

export async function updateUserStatus(userId: string, enabled: boolean) {
    await checkAdminAccess();

    await db.update(users).set({ enabled }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function updateUserPremium(userId: string, premiumUser: boolean) {
    await checkAdminAccess();

    await db.update(users).set({ premiumUser }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function updateUserAdmin(userId: string, isAdmin: boolean) {
    await checkAdminAccess();

    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function getUsers() {
    await checkAdminAccess();

    return await db
        .select({
            id: users.id,
            spotifyId: users.spotifyId,
            premiumUser: users.premiumUser,
            enabled: users.enabled,
            isAdmin: users.isAdmin,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(users.createdAt);
}

export async function getInvites() {
    await checkAdminAccess();

    return await db
        .select({
            id: invites.id,
            code: invites.code,
            name: invites.name,
            status: invites.status,
            maxUses: invites.maxUses,
            currentUses: invites.currentUses,
            expiresAt: invites.expiresAt,
            createdAt: invites.createdAt,
            createdBy: invites.createdBy,
            createdByUser: {
                spotifyId: users.spotifyId,
            },
        })
        .from(invites)
        .leftJoin(users, eq(invites.createdBy, users.id))
        .orderBy(invites.createdAt);
}

export async function updateInviteStatus(
    inviteId: bigint,
    status: "active" | "disabled" | "expired",
) {
    await checkAdminAccess();

    await db.update(invites).set({ status }).where(eq(invites.id, inviteId));

    revalidatePath("/admin");
}

export async function getFriendships() {
    await checkAdminAccess();

    return await db
        .select({
            id: friends.id,
            status: friends.status,
            createdAt: friends.createdAt,
            userId: friends.userId,
            friendId: friends.friendId,
        })
        .from(friends)
        .orderBy(friends.createdAt);
}

export async function getFriendshipsWithUsers() {
    await checkAdminAccess();

    const friendshipsData = await db
        .select({
            id: friends.id,
            status: friends.status,
            createdAt: friends.createdAt,
            userId: friends.userId,
            friendId: friends.friendId,
        })
        .from(friends)
        .orderBy(friends.createdAt);

    // For accepted friendships, deduplicate by keeping only one per unique pair
    // For pending/rejected, keep all (they're meaningful one-way relationships)
    const processedFriendships = [];
    const seenAcceptedPairs = new Set<string>();

    for (const friendship of friendshipsData) {
        if (friendship.status === "accepted") {
            // Create a consistent pair key (smaller ID first)
            const pairKey =
                friendship.userId < friendship.friendId
                    ? `${friendship.userId}-${friendship.friendId}`
                    : `${friendship.friendId}-${friendship.userId}`;

            if (!seenAcceptedPairs.has(pairKey)) {
                seenAcceptedPairs.add(pairKey);
                processedFriendships.push(friendship);
            }
        } else {
            // Show all pending/rejected requests (they're one-way and meaningful)
            processedFriendships.push(friendship);
        }
    }

    // Get user data separately to avoid join complexity
    const userIds = [
        ...new Set([
            ...processedFriendships.map((f) => f.userId),
            ...processedFriendships.map((f) => f.friendId),
        ]),
    ];

    const usersData = await db
        .select({
            id: users.id,
            spotifyId: users.spotifyId,
        })
        .from(users)
        .where(inArray(users.id, userIds));

    const userMap = new Map(usersData.map((u) => [u.id, u]));

    return processedFriendships.map((friendship) => ({
        ...friendship,
        user: userMap.get(friendship.userId),
        friend: userMap.get(friendship.friendId),
    }));
}
