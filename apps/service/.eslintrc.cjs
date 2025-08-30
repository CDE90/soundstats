/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "@typescript-eslint/recommended-type-checked"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_"
      }
    ]
  }
};

module.exports = config;
