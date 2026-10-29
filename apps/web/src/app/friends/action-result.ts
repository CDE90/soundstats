export type SocialActionResult = { success?: boolean; error?: string };

/** Server actions return expected failures; a resolved promise is not success. */
export function requireActionSuccess(result: SocialActionResult) {
    if (result.success !== true) {
        throw new Error(
            result.error || "The change could not be saved. Please try again.",
        );
    }
}
