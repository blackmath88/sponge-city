import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 5175);
const prefix = "/wrapper/data-charter-map";
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

createServer(async (request, response) => {
  let path = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (path.startsWith(prefix)) path = path.slice(prefix.length);
  if (path === "" || path === "/") path = "/index.html";
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { response.writeHead(403).end("Forbidden"); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "0.0.0.0", () => console.log(`Data Charter: http://localhost:${port}${prefix}/`));
