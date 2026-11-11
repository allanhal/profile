import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function checkLink(url, timeout = 12000) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
      headers: { "User-Agent": "Portfolio-Link-Checker/1.0" },
    });
    const status = response.status;
    await response.body?.cancel();
    return { url, status };
  } catch {
    return { url, status: null };
  }
}

export function createStatusServer(urls, { ttl = 300000, check = checkLink } = {}) {
  let cached;
  let expires = 0;
  let pending;

  async function refresh() {
    const queue = [...new Set(urls)];
    const links = [];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) links.push(await check(queue.shift()));
    }));
    cached = { checkedAt: new Date().toISOString(), links };
    expires = Date.now() + ttl;
    return cached;
  }

  return createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    if (request.url !== "/api/live-status") {
      response.writeHead(404).end('{"error":"Not found"}');
      return;
    }
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      response.writeHead(405).end('{"error":"Method not allowed"}');
      return;
    }
    try {
      if (!cached || Date.now() >= expires) {
        pending ??= refresh().finally(() => { pending = undefined; });
        await pending;
      }
      response.end(JSON.stringify(cached));
    } catch {
      response.writeHead(503).end('{"error":"Link checks unavailable"}');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = JSON.parse(await readFile(new URL("./data.json", import.meta.url), "utf8"));
  const urls = data.projects.map((project) => project.live).filter(Boolean);
  createStatusServer(urls).listen(3000, "0.0.0.0");
}
