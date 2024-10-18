import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
  ],
  minify: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  outDir: "out",
  dts: true,
  format: ["cjs", "esm"],
});
