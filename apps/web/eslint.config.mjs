import { defineConfig, globalIgnores } from "eslint/config";
import query from "@tanstack/eslint-plugin-query";
import drizzle from "eslint-plugin-drizzle";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
    {
        linterOptions: {
            reportUnusedDisableDirectives: "off",
        },
    },
    ...nextVitals,
    ...nextTypescript,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "@tanstack/query": query,
            drizzle,
        },
        rules: {
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/consistent-type-imports": [
                "warn",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: {
                        attributes: false,
                    },
                },
            ],
            "@typescript-eslint/no-empty-function": "off",
            "react-hooks/set-state-in-effect": "off",
            "drizzle/enforce-delete-with-where": [
                "error",
                {
                    drizzleObjectName: ["db", "ctx.db"],
                },
            ],
            "drizzle/enforce-update-with-where": [
                "error",
                {
                    drizzleObjectName: ["db", "ctx.db"],
                },
            ],
        },
    },
    globalIgnores([
        ".next/**",
        "dist/**",
        "eslint.config.mjs",
        "next-env.d.ts",
        "next.config.js",
        "postcss.config.js",
        "tailwind.config.js",
    ]),
]);
