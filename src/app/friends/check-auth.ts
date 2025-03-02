import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function checkAuth(): Promise<string> {
    const { userId } = await auth();
    
    if (!userId) {
        redirect("/");
    }
    
    return userId;
}