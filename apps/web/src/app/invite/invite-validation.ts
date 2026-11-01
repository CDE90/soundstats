export const inviteLimitMessage = "Enter a whole number from 1 to 1,000.";

export function validateInviteLimit(
    value: number | null | undefined,
    unlimited: boolean,
) {
    if (unlimited) return undefined;
    return typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 1000
        ? undefined
        : inviteLimitMessage;
}

export type InviteRelationship =
    "anonymous" | "owner" | "friends" | "pending" | "new";

export function inviteRelationship(
    viewerId: string | null,
    ownerId: string,
    statuses: readonly string[],
): InviteRelationship {
    if (!viewerId) return "anonymous";
    if (viewerId === ownerId) return "owner";
    if (statuses.includes("accepted")) return "friends";
    if (statuses.includes("pending")) return "pending";
    return "new";
}
