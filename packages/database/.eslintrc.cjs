/** @type {import("eslint").Linter.Config} */
const config = {
    extends: [
        "@typescript-eslint/recommended-type-checked",
        "plugin:drizzle/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: true,
    },
    plugins: ["@typescript-eslint", "drizzle"],
    rules: {
        "@typescript-eslint/consistent-type-imports": [
            "warn",
            {
                prefer: "type-imports",
                fixStyle: "inline-type-imports",
            },
        ],
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
};

module.exports = config;
