import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import drizzle from "eslint-plugin-drizzle";

export default [
    {
        ignores: ["dist/**"],
    },
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            "@typescript-eslint": tseslint,
            drizzle,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "warn",
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
];
