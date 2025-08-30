"use server";

import { captureAuthenticatedEvent } from "@/lib/posthog";
import { db } from "@/server/db";
import { friends, invites } from "@/server/db/schema";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function getMyInvites() {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Not authenticated" };
    }

    try {
        const myInvites = await db
            .select({
                id: invites.id,
                code: invites.code,
                name: invites.name,
                status: invites.status,
                maxUses: invites.maxUses,
                currentUses: invites.currentUses,
                expiresAt: invites.expiresAt,
                createdAt: invites.createdAt,
            })
            .from(invites)
            .where(eq(invites.createdBy, userId))
            .orderBy(invites.createdAt);

        return { invites: myInvites };
    } catch (error) {
        console.error("Error fetching invites:", error);
        return { error: "Failed to fetch invites" };
    }
}

export async function createInvite(
    name?: string,
    expiresIn?: number,
    maxUses?: number,
) {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Not authenticated" };
    }

    try {
        let code = generateInviteCode();
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            const existing = await db
                .select()
                .from(invites)
                .where(eq(invites.code, code))
                .limit(1);

            if (existing.length === 0) break;

            code = generateInviteCode();
            attempts++;
        }

        if (attempts >= maxAttempts) {
            return { error: "Failed to generate unique invite code" };
        }

        const expiresAt = expiresIn
            ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
            : null;

        const [newInvite] = await db
            .insert(invites)
            .values({
                createdBy: userId,
                code,
                name: name ?? null,
                expiresAt,
                maxUses: maxUses ?? null,
                status: "active",
            })
            .returning();

        await captureAuthenticatedEvent(userId, "invite_created", {
            invite_code: code,
            invite_name: name,
            expires_in_days: expiresIn,
        });

        revalidatePath("/invite");
        return { success: true, invite: newInvite };
    } catch (error) {
        console.error("Error creating invite:", error);
        return { error: "Failed to create invite" };
    }
}

export async function deleteInvite(inviteId: bigint) {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Not authenticated" };
    }

    try {
        const invite = await db
            .select()
            .from(invites)
            .where(and(eq(invites.id, inviteId), eq(invites.createdBy, userId)))
            .limit(1);

        if (invite.length === 0) {
            return { error: "Invite not found" };
        }

        await db.delete(invites).where(eq(invites.id, inviteId));

        await captureAuthenticatedEvent(userId, "invite_deleted", {
            invite_code: invite[0]?.code,
        });

        revalidatePath("/invite");
        return { success: true };
    } catch (error) {
        console.error("Error deleting invite:", error);
        return { error: "Failed to delete invite" };
    }
}

export async function toggleInviteStatus(inviteId: bigint) {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Not authenticated" };
    }

    try {
        const [invite] = await db
            .select()
            .from(invites)
            .where(and(eq(invites.id, inviteId), eq(invites.createdBy, userId)))
            .limit(1);

        if (!invite) {
            return { error: "Invite not found" };
        }

        const newStatus = invite.status === "active" ? "disabled" : "active";

        await db
            .update(invites)
            .set({ status: newStatus })
            .where(eq(invites.id, inviteId));

        await captureAuthenticatedEvent(userId, "invite_status_changed", {
            invite_code: invite.code,
            old_status: invite.status,
            new_status: newStatus,
        });

        revalidatePath("/invite");
        return { success: true };
    } catch (error) {
        console.error("Error toggling invite status:", error);
        return { error: "Failed to toggle invite status" };
    }
}

export async function getInviteByCode(code: string) {
    try {
        const invite = await db
            .select({
                id: invites.id,
                code: invites.code,
                name: invites.name,
                status: invites.status,
                createdBy: invites.createdBy,
                maxUses: invites.maxUses,
                currentUses: invites.currentUses,
                expiresAt: invites.expiresAt,
                createdAt: invites.createdAt,
            })
            .from(invites)
            .where(eq(invites.code, code.toUpperCase()))
            .limit(1);

        if (invite.length === 0) {
            return { error: "Invite not found" };
        }

        const inviteData = invite[0]!;

        if (inviteData.status !== "active") {
            return { error: "Invite is not active" };
        }

        if (inviteData.expiresAt && inviteData.expiresAt < new Date()) {
            return { error: "Invite has expired" };
        }

        if (
            inviteData.maxUses &&
            inviteData.currentUses >= inviteData.maxUses
        ) {
            return { error: "Invite has reached maximum uses" };
        }

        const inviterInfo = await (
            await clerkClient()
        ).users.getUser(inviteData.createdBy);

        return {
            invite: inviteData,
            inviterName:
                inviterInfo.firstName && inviterInfo.lastName
                    ? `${inviterInfo.firstName} ${inviterInfo.lastName}`
                    : (inviterInfo.firstName ??
                      inviterInfo.emailAddresses[0]?.emailAddress ??
                      "Someone"),
            inviterImage: inviterInfo.imageUrl,
        };
    } catch (error) {
        console.error("Error fetching invite:", error);
        return { error: "Failed to fetch invite" };
    }
}

export async function acceptInvite(code: string) {
    const { userId } = await auth();
    if (!userId) {
        return { error: "Not authenticated" };
    }

    try {
        const inviteResult = await getInviteByCode(code);
        if ("error" in inviteResult) {
            return inviteResult;
        }

        const { invite } = inviteResult;

        if (invite.createdBy === userId) {
            return { error: "You cannot accept your own invite" };
        }

        const existingRelation = await db
            .select()
            .from(friends)
            .where(
                or(
                    and(
                        eq(friends.userId, userId),
                        eq(friends.friendId, invite.createdBy),
                    ),
                    and(
                        eq(friends.userId, invite.createdBy),
                        eq(friends.friendId, userId),
                    ),
                ),
            );

        if (existingRelation.length === 0) {
            await db.insert(friends).values({
                userId: invite.createdBy,
                friendId: userId,
                status: "accepted",
            });

            await db.insert(friends).values({
                userId: userId,
                friendId: invite.createdBy,
                status: "accepted",
            });
        }

        await db
            .update(invites)
            .set({
                currentUses: invite.currentUses + 1,
                status:
                    invite.maxUses && invite.currentUses + 1 >= invite.maxUses
                        ? "used"
                        : "active",
            })
            .where(eq(invites.id, invite.id));

        await captureAuthenticatedEvent(userId, "invite_accepted", {
            invite_code: code,
            inviter_id: invite.createdBy,
        });

        await captureAuthenticatedEvent(invite.createdBy, "invite_used", {
            invite_code: code,
            invited_user_id: userId,
        });

        revalidatePath("/friends");
        return {
            success: true,
            inviterName: inviteResult.inviterName,
            inviterId: invite.createdBy,
        };
    } catch (error) {
        console.error("Error accepting invite:", error);
        return { error: "Failed to accept invite" };
    }
}
