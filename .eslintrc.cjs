/** @type {import("eslint").Linter.Config} */
const config = {
    extends: ["plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    rules: {
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-explicit-any": "warn",
    },
    ignorePatterns: ["dist", "node_modules", ".next"],
};

module.exports = config;
