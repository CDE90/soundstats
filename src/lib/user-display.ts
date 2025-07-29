export interface UserDisplayData {
    firstName?: string | null;
    lastName?: string | null;
    emailAddress?: string;
    spotifyId?: string;
}

/**
 * Gets the display name for a user, prioritizing names over email over spotify ID
 * Priority: firstName lastName > firstName > lastName > emailAddress > spotifyId > "Unknown"
 */
export function getUserDisplayName(user?: UserDisplayData): string {
    if (!user) return "Unknown";

    if (user.firstName || user.lastName) {
        return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    }

    if (user.emailAddress) {
        return user.emailAddress;
    }

    if (user.spotifyId) {
        return user.spotifyId;
    }

    return "Unknown";
}

/**
 * Gets initials for a user avatar, prioritizing names over email over spotify ID
 * Priority: first+last initials > first name 2 chars > last name 2 chars > email 2 chars > spotify 2 chars > "??"
 */
export function getUserInitials(user?: UserDisplayData): string {
    if (!user) return "??";

    if (user.firstName && user.lastName) {
        return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    if (user.firstName) {
        return `${user.firstName.charAt(0)}${user.firstName.charAt(1) ?? ""}`.toUpperCase();
    }

    if (user.lastName) {
        return `${user.lastName.charAt(0)}${user.lastName.charAt(1) ?? ""}`.toUpperCase();
    }

    if (user.emailAddress) {
        return user.emailAddress.slice(0, 2).toUpperCase();
    }

    if (user.spotifyId) {
        return user.spotifyId.slice(0, 2).toUpperCase();
    }

    return "??";
}

/**
 * Checks if user has any name information (firstName or lastName)
 * Useful for determining if email should be shown as secondary info
 */
export function userHasNameInfo(user?: UserDisplayData): boolean {
    return !!(user?.firstName ?? user?.lastName);
}
