/** @type {import("eslint").Linter.Config} */
const config = {
    extends: ["../../.eslintrc.cjs"],
    plugins: ["drizzle"],
    rules: {
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
