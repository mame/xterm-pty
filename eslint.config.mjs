import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "demo/build",
      "demo/dist",
      "demo/static",
      "out",
      "emscripten-pty.js",
      "index.js",
      "index.mjs",
      "index.d.ts",
      "index.d.mts",
      "examples/**/*.js",
      "examples/**/*.mjs",
      "tests/**/*.js",
      "tests/**/*.mjs",
      "playwright-report",
      "test-results",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {},
  },
  prettierConfig,
];
