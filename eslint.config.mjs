import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {ignores: ["demo/build", "demo/dist", "demo/static", "out", "emscripten-pty.js"]},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];