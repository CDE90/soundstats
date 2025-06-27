"use server";

import { captureAuthenticatedEvent } from "@/lib/posthog";
import { logger } from "@/lib/axiom/server";
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
    
    logger.info("Fetching user invites", {
        userId: userId,
        hasAuth: !!userId
    });
    
    if (!userId) {
        logger.warn("Unauthenticated invite fetch attempt");
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

        logger.info("User invites fetched successfully", {
            userId,
            inviteCount: myInvites.length,
            activeInvites: myInvites.filter(inv => inv.status === "active").length,
            expiredInvites: myInvites.filter(inv => inv.expiresAt && inv.expiresAt < new Date()).length
        });

        return { invites: myInvites };
    } catch (error) {
        logger.error("Failed to fetch user invites", {
            userId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to fetch invites" };
    }
}

export async function createInvite(
    name?: string,
    expiresIn?: number,
    maxUses?: number,
) {
    const { userId } = await auth();
    
    logger.info("Creating new invite", {
        userId: userId,
        inviteName: name,
        expiresInDays: expiresIn,
        maxUses: maxUses,
        hasAuth: !!userId
    });
    
    if (!userId) {
        logger.warn("Unauthenticated invite creation attempt");
        return { error: "Not authenticated" };
    }

    try {
        let code = generateInviteCode();
        let attempts = 0;
        const maxAttempts = 5;

        logger.debug("Generating unique invite code", {
            userId,
            initialCode: code
        });

        while (attempts < maxAttempts) {
            const existing = await db
                .select()
                .from(invites)
                .where(eq(invites.code, code))
                .limit(1);

            if (existing.length === 0) break;

            code = generateInviteCode();
            attempts++;
            
            logger.debug("Invite code collision, regenerating", {
                userId,
                attempt: attempts,
                newCode: code
            });
        }

        if (attempts >= maxAttempts) {
            logger.error("Failed to generate unique invite code", {
                userId,
                attemptsUsed: attempts,
                maxAttempts
            });
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

        logger.info("Invite created successfully", {
            userId,
            inviteId: newInvite?.id,
            inviteCode: code,
            inviteName: name,
            expiresAt: expiresAt?.toISOString(),
            maxUses,
            codeGenerationAttempts: attempts
        });

        await captureAuthenticatedEvent(userId, "invite_created", {
            invite_code: code,
            invite_name: name,
            expires_in_days: expiresIn,
        });

        revalidatePath("/invite");
        return { success: true, invite: newInvite };
    } catch (error) {
        logger.error("Failed to create invite", {
            userId,
            inviteName: name,
            expiresInDays: expiresIn,
            maxUses,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to create invite" };
    }
}

export async function deleteInvite(inviteId: bigint) {
    const { userId } = await auth();
    
    logger.info("Deleting invite", {
        userId: userId,
        inviteId: inviteId.toString(),
        hasAuth: !!userId
    });
    
    if (!userId) {
        logger.warn("Unauthenticated invite deletion attempt", {
            inviteId: inviteId.toString()
        });
        return { error: "Not authenticated" };
    }

    try {
        const invite = await db
            .select()
            .from(invites)
            .where(and(eq(invites.id, inviteId), eq(invites.createdBy, userId)))
            .limit(1);

        if (invite.length === 0) {
            logger.warn("Invite not found or unauthorized deletion", {
                userId,
                inviteId: inviteId.toString()
            });
            return { error: "Invite not found" };
        }

        await db.delete(invites).where(eq(invites.id, inviteId));

        logger.info("Invite deleted successfully", {
            userId,
            inviteId: inviteId.toString(),
            inviteCode: invite[0]?.code,
            inviteStatus: invite[0]?.status,
            currentUses: invite[0]?.currentUses
        });

        await captureAuthenticatedEvent(userId, "invite_deleted", {
            invite_code: invite[0]?.code,
        });

        revalidatePath("/invite");
        return { success: true };
    } catch (error) {
        logger.error("Failed to delete invite", {
            userId,
            inviteId: inviteId.toString(),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to delete invite" };
    }
}

export async function toggleInviteStatus(inviteId: bigint) {
    const { userId } = await auth();
    
    logger.info("Toggling invite status", {
        userId: userId,
        inviteId: inviteId.toString(),
        hasAuth: !!userId
    });
    
    if (!userId) {
        logger.warn("Unauthenticated invite status toggle attempt", {
            inviteId: inviteId.toString()
        });
        return { error: "Not authenticated" };
    }

    try {
        const [invite] = await db
            .select()
            .from(invites)
            .where(and(eq(invites.id, inviteId), eq(invites.createdBy, userId)))
            .limit(1);

        if (!invite) {
            logger.warn("Invite not found or unauthorized status toggle", {
                userId,
                inviteId: inviteId.toString()
            });
            return { error: "Invite not found" };
        }

        const newStatus = invite.status === "active" ? "disabled" : "active";

        logger.info("Changing invite status", {
            userId,
            inviteId: inviteId.toString(),
            inviteCode: invite.code,
            oldStatus: invite.status,
            newStatus
        });

        await db
            .update(invites)
            .set({ status: newStatus })
            .where(eq(invites.id, inviteId));

        logger.info("Invite status changed successfully", {
            userId,
            inviteId: inviteId.toString(),
            inviteCode: invite.code,
            oldStatus: invite.status,
            newStatus,
            currentUses: invite.currentUses
        });

        await captureAuthenticatedEvent(userId, "invite_status_changed", {
            invite_code: invite.code,
            old_status: invite.status,
            new_status: newStatus,
        });

        revalidatePath("/invite");
        return { success: true };
    } catch (error) {
        logger.error("Failed to toggle invite status", {
            userId,
            inviteId: inviteId.toString(),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to toggle invite status" };
    }
}

export async function getInviteByCode(code: string) {
    const normalizedCode = code.toUpperCase();
    
    logger.info("Fetching invite by code", {
        inviteCode: normalizedCode
    });
    
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
            .where(eq(invites.code, normalizedCode))
            .limit(1);

        if (invite.length === 0) {
            logger.warn("Invite code not found", {
                inviteCode: normalizedCode
            });
            return { error: "Invite not found" };
        }

        const inviteData = invite[0]!;

        logger.info("Invite found, validating", {
            inviteCode: normalizedCode,
            inviteId: inviteData.id,
            status: inviteData.status,
            currentUses: inviteData.currentUses,
            maxUses: inviteData.maxUses,
            expiresAt: inviteData.expiresAt?.toISOString(),
            createdBy: inviteData.createdBy
        });

        if (inviteData.status !== "active") {
            logger.warn("Invite is not active", {
                inviteCode: normalizedCode,
                status: inviteData.status
            });
            return { error: "Invite is not active" };
        }

        if (inviteData.expiresAt && inviteData.expiresAt < new Date()) {
            logger.warn("Invite has expired", {
                inviteCode: normalizedCode,
                expiresAt: inviteData.expiresAt.toISOString(),
                currentTime: new Date().toISOString()
            });
            return { error: "Invite has expired" };
        }

        if (
            inviteData.maxUses &&
            inviteData.currentUses >= inviteData.maxUses
        ) {
            logger.warn("Invite has reached maximum uses", {
                inviteCode: normalizedCode,
                currentUses: inviteData.currentUses,
                maxUses: inviteData.maxUses
            });
            return { error: "Invite has reached maximum uses" };
        }

        const inviterInfo = await (
            await clerkClient()
        ).users.getUser(inviteData.createdBy);

        const inviterName = inviterInfo.firstName && inviterInfo.lastName
            ? `${inviterInfo.firstName} ${inviterInfo.lastName}`
            : (inviterInfo.firstName ??
              inviterInfo.emailAddresses[0]?.emailAddress ??
              "Someone");

        logger.info("Valid invite fetched successfully", {
            inviteCode: normalizedCode,
            inviteId: inviteData.id,
            inviterName: inviterName,
            hasInviterImage: !!inviterInfo.imageUrl
        });

        return {
            invite: inviteData,
            inviterName,
            inviterImage: inviterInfo.imageUrl,
        };
    } catch (error) {
        logger.error("Failed to fetch invite by code", {
            inviteCode: normalizedCode,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to fetch invite" };
    }
}

export async function acceptInvite(code: string) {
    const { userId } = await auth();
    
    logger.info("Accepting invite", {
        inviteCode: code,
        userId: userId,
        hasAuth: !!userId
    });
    
    if (!userId) {
        logger.warn("Unauthenticated invite acceptance attempt", {
            inviteCode: code
        });
        return { error: "Not authenticated" };
    }

    try {
        const inviteResult = await getInviteByCode(code);
        if ("error" in inviteResult) {
            logger.warn("Cannot accept invite - validation failed", {
                inviteCode: code,
                userId,
                error: inviteResult.error
            });
            return inviteResult;
        }

        const { invite } = inviteResult;

        if (invite.createdBy === userId) {
            logger.warn("User attempted to accept own invite", {
                inviteCode: code,
                userId,
                inviteCreator: invite.createdBy
            });
            return { error: "You cannot accept your own invite" };
        }

        logger.info("Checking existing friendship", {
            inviteCode: code,
            userId,
            inviteCreator: invite.createdBy
        });

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
            logger.info("Creating new friendship", {
                inviteCode: code,
                userId,
                inviteCreator: invite.createdBy
            });

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
        } else {
            logger.info("Friendship already exists", {
                inviteCode: code,
                userId,
                inviteCreator: invite.createdBy,
                existingRelationCount: existingRelation.length
            });
        }

        const newUseCount = invite.currentUses + 1;
        const newStatus = invite.maxUses && newUseCount >= invite.maxUses ? "used" : "active";

        await db
            .update(invites)
            .set({
                currentUses: newUseCount,
                status: newStatus,
            })
            .where(eq(invites.id, invite.id));

        logger.info("Invite accepted successfully", {
            inviteCode: code,
            inviteId: invite.id,
            userId,
            inviteCreator: invite.createdBy,
            inviterName: inviteResult.inviterName,
            newUseCount,
            newStatus,
            friendshipCreated: existingRelation.length === 0
        });

        await captureAuthenticatedEvent(userId, "invite_accepted", {
            invite_code: code,
            inviter_id: invite.createdBy,
        });

        await captureAuthenticatedEvent(invite.createdBy, "invite_used", {
            invite_code: code,
            invited_user_id: userId,
        });

        revalidatePath("/friends");
        return { success: true, inviterName: inviteResult.inviterName };
    } catch (error) {
        logger.error("Failed to accept invite", {
            inviteCode: code,
            userId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return { error: "Failed to accept invite" };
    }
}
