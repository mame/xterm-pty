import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const hostname = "localhost";
const port = 33333;

const basedir = path.dirname(fileURLToPath(import.meta.url));

http
  .createServer(function (request, response) {
    console.log("request ", request.url);

    response.setHeader("Cross-Origin-Opener-Policy", "same-origin")
    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp")

    if (request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html" });
      const htmls = fs.readdirSync(basedir).flatMap((dir) => {
        if (!fs.lstatSync(path.join(basedir, dir)).isDirectory()) return [];
        return fs.readdirSync(path.join(basedir, dir)).map((file) => path.join(dir, file));
      }).filter((file) => path.extname(file) === ".html");

      const title = "xterm-pty examples (for test)";
      const head = `<head><title>${title}</title></head>`;
      const contents = htmls.length === 0 ? "No examples found" : htmls.map(
        (file) => `<li><a href="${file}">${file}</a></li>`,
      ).join("");
      const body = `<body><h1>${title}</h1><ul>${contents}</ul></body>`;
      response.end(`<!DOCTYPE html><html>${head}${body}</html>`, "utf-8");
      return;
    }

    const filePath0 = request.url.startsWith("/root/")
      ? path.join(path.dirname(basedir), request.url.substring(6))
      : path.join(basedir, request.url);
    const filePath = filePath0.endsWith("/") ? filePath0 + "index.html" : filePath0;

    var extname = String(path.extname(filePath)).toLowerCase();
    var mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".css": "text/css",
      ".wasm": "application/wasm",
    };
    var contentType = mimeTypes[extname] || "application/octet-stream";

    fs.readFile(filePath, function (error, content) {
      if (error) {
        if (error.code == "ENOENT") {
          response.writeHead(404, { "Content-Type": "text/html" });
          response.end("404 Not Found", "utf-8");
        } else {
          response.writeHead(500);
          response.end(
            "Sorry, check with the site admin for error: " +
              error.code +
              " ..\n",
          );
        }
      } else {
        response.writeHead(200, { "Content-Type": contentType });
        response.end(content, "utf-8");
      }
    });
  })
  .listen(port, hostname);
console.log(`Server running at http://${hostname}:${port}/`);
