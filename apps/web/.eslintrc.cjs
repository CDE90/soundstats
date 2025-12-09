/** @type {import("eslint").Linter.Config} */
const config = {
    extends: [
        "next/core-web-vitals",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/stylistic",
        "plugin:drizzle/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint", "drizzle", "@tanstack/query"],
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
    ignorePatterns: [".eslintrc.cjs", "next.config.js", "postcss.config.js", "tailwind.config.js"],
};

module.exports = config;
