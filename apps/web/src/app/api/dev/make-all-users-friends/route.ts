import { db } from "@/server/db";
import { friends } from "@/server/db/schema";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = POST;

/**
 * API endpoint to make all users friends with each other
 * This is for development purposes only and should be disabled in production
 */
export async function POST() {
    // Security check - only allow in development
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { error: "This endpoint is only available in development mode" },
            { status: 403 },
        );
    }

    try {
        // Fetch all users from Clerk
        const clerkUsers = await (
            await clerkClient()
        ).users.getUserList({
            limit: 100, // Adjust as needed
        });

        if (!clerkUsers.data || clerkUsers.data.length === 0) {
            return NextResponse.json(
                { message: "No users found" },
                { status: 200 },
            );
        }

        const userIds = clerkUsers.data.map((user) => user.id);
        let friendshipsCreated = 0;
        const errors: string[] = [];

        // For each user, create a friendship with all other users
        for (let i = 0; i < userIds.length; i++) {
            const currentUserId = userIds[i];

            for (let j = i + 1; j < userIds.length; j++) {
                const friendId = userIds[j];

                // Skip self-friendships
                if (currentUserId === friendId) continue;

                // If either currentUserId or friendId is undefined, skip the friendship
                if (!currentUserId || !friendId) continue;

                try {
                    // Check if a relationship already exists
                    const existingRelation = await db
                        .select()
                        .from(friends)
                        .where(
                            or(
                                and(
                                    eq(friends.userId, currentUserId),
                                    eq(friends.friendId, friendId),
                                ),
                                and(
                                    eq(friends.userId, friendId),
                                    eq(friends.friendId, currentUserId),
                                ),
                            ),
                        );

                    // If relationship exists, update it to accepted if needed
                    if (existingRelation.length > 0) {
                        for (const relation of existingRelation) {
                            if (relation.status !== "accepted") {
                                await db
                                    .update(friends)
                                    .set({ status: "accepted" })
                                    .where(eq(friends.id, relation.id));
                                friendshipsCreated++;
                            }
                        }
                    } else {
                        // Create bidirectional friendship (A -> B and B -> A)
                        // First direction
                        await db.insert(friends).values({
                            userId: currentUserId,
                            friendId: friendId,
                            status: "accepted",
                        });

                        // Second direction
                        await db.insert(friends).values({
                            userId: friendId,
                            friendId: currentUserId,
                            status: "accepted",
                        });

                        friendshipsCreated += 2;
                    }
                } catch (error) {
                    console.error(
                        `Error creating friendship between ${currentUserId} and ${friendId}:`,
                        error,
                    );
                    errors.push(
                        `Failed to create friendship between ${currentUserId} and ${friendId}`,
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Created ${friendshipsCreated} friendships`,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error("Error making users friends:", error);
        return NextResponse.json(
            { error: "Failed to make users friends" },
            { status: 500 },
        );
    }
}
