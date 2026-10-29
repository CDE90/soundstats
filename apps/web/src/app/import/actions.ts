"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getImportJobs, retryImportJob } from "@/server/import-job-queries";

export async function getImportHistory() {
    const { userId } = await auth();
    if (!userId) return { error: "Sign in again to view your imports." };
    try {
        return { jobs: await getImportJobs(db, userId) };
    } catch {
        return { error: "Your import history couldn’t load. Try again." };
    }
}

export async function retryImport(id: string) {
    const { userId } = await auth();
    if (!userId) return { error: "Sign in again to retry this import." };
    if (!/^[1-9]\d{0,18}$/.test(id))
        return { error: "This import could not be found." };
    try {
        if (!(await retryImportJob(db, userId, BigInt(id))))
            return {
                error: "This import cannot be retried. Refresh its status or choose the original file again.",
            };
        revalidatePath("/import");
        return { success: true };
    } catch {
        return { error: "The import couldn’t be queued. Try again." };
    }
}
