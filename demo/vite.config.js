import { defineConfig } from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  worker: {
    format: "es",
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "static/{_headers,*.wasm,*.data}",
          dest: ".",
        },
      ],
    }),
    {
      name: "isolation",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
});