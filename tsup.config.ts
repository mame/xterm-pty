import { defineConfig, Options } from "tsup";
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';

export default defineConfig({
  entry: [
    "src/index.ts",
  ],
  minify: true,
  sourcemap: true,
  clean: true,
  outDir: "out",
  dts: true,
  format: ["esm", "umd"] as Options["format"],
  esbuildPlugins: [umdWrapper()],
});
