import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string(),
    CLERK_SECRET_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
