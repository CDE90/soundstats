import { createClerkClient } from "@clerk/backend";
import { env } from "./env.js";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export { clerkClient };
