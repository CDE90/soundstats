import { createClerkClient } from "@clerk/backend";
import { env } from "./env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export { clerkClient };
