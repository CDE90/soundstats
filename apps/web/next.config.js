/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    cacheComponents: true,
    cacheLife: {
        default: {
            revalidate: 60 * 2,
            expire: 60 * 60 * 24 * 7,
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "i.scdn.co",
                port: "",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "img.clerk.com",
                port: "",
                pathname: "/**",
            },
        ],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            {
                source: "/ingest/static/:path*",
                destination: "https://eu-assets.i.posthog.com/static/:path*",
            },
            {
                source: "/ingest/:path*",
                destination: "https://eu.i.posthog.com/:path*",
            },
            {
                source: "/ingest/decide",
                destination: "https://eu.i.posthog.com/decide",
            },
        ];
    },
    skipTrailingSlashRedirect: true,
};

export default config;
