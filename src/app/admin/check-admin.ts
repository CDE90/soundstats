import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function checkAdminAccess() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/");
    }

    const user = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user[0]?.isAdmin) {
        redirect("/");
    }

    return userId;
}
