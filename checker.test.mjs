import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { checkLink, createStatusServer } from "./checker.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

test("checks GET status, follows redirects, and reports failures and timeouts", async () => {
  const origin = createServer((request, response) => {
    if (request.url === "/slow") return;
    if (request.url === "/redirect") {
      response.writeHead(302, { Location: "/ok" }).end();
    } else {
      response.writeHead(request.method === "HEAD" ? 405 : request.url === "/ok" ? 200 : 503).end();
    }
  });
  const base = await listen(origin);
  try {
    assert.equal((await checkLink(base + "/ok")).status, 200);
    assert.equal((await checkLink(base + "/redirect")).status, 200);
    assert.equal((await checkLink(base + "/down")).status, 503);
    assert.equal((await checkLink(base + "/slow", 30)).status, null);
  } finally {
    await close(origin);
  }
  assert.equal((await checkLink(base + "/ok", 100)).status, null);
});

test("shares concurrent checks, caches results, refreshes expiry and rejects arbitrary targets", async () => {
  let calls = 0;
  let currentStatus = 503;
  const server = createStatusServer(["https://configured.test/", "https://configured.test/"], {
    ttl: 40,
    check: async (url) => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { url, status: currentStatus };
    },
  });
  const base = await listen(server);
  try {
    const results = await Promise.all(Array.from({ length: 5 }, () => fetch(base + "/api/live-status").then((r) => r.json())));
    assert.equal(calls, 1);
    assert.equal(results[0].links.length, 1);
    assert.equal(results[0].links[0].status, 503);
    assert.equal((await fetch(base + "/api/live-status")).headers.get("cache-control"), "no-store");
    assert.equal(calls, 1);
    assert.equal((await fetch(base + "/api/live-status?url=http://127.0.0.1")).status, 404);
    assert.equal((await fetch(base + "/api/live-status", { method: "POST" })).status, 405);
    currentStatus = 200;
    await new Promise((resolve) => setTimeout(resolve, 50));
    const recovered = await fetch(base + "/api/live-status").then((r) => r.json());
    assert.equal(recovered.links[0].status, 200);
    assert.equal(calls, 2);
  } finally {
    await close(server);
  }
});

test("live links stay disabled for errors, enable only on 200, and recover on later checks", async () => {
  const { readFile } = await import("node:fs/promises");
  const { runInNewContext } = await import("node:vm");
  const links = ["ok", "down", "unknown"].map((name) => ({
    dataset: { liveUrl: `https://${name}.test/` },
    attributes: new Map([["aria-disabled", "true"], ["tabindex", "-1"]]),
    setAttribute(key, value) { this.attributes.set(key, value); },
    removeAttribute(key) { this.attributes.delete(key); if (key === "href") delete this.href; },
  }));
  let statuses = [200, 503, null];
  let fail = false;
  const context = {
    document: { querySelectorAll: () => links },
    AbortSignal,
    fetch: async () => {
      if (fail) throw new Error("API offline");
      return { ok: true, json: async () => ({ links: links.map((link, i) => ({ url: link.dataset.liveUrl, status: statuses[i] })) }) };
    },
  };
  const source = (await readFile(new URL("./index.js", import.meta.url), "utf8")).replace(/\ninit\(\);\s*$/, "");
  runInNewContext(source, context);
  await context.updateLiveLinks();
  assert.equal(links[0].href, links[0].dataset.liveUrl);
  assert.equal(links[0].attributes.get("aria-disabled"), "false");
  assert.equal(links[1].href, undefined);
  assert.equal(links[1].textContent, "live [503]");
  assert.equal(links[2].textContent, "live [unavailable]");
  statuses = [404, 200, 200];
  await context.updateLiveLinks();
  assert.equal(links[0].href, undefined);
  assert.equal(links[0].attributes.get("tabindex"), "-1");
  assert.equal(links[1].href, links[1].dataset.liveUrl);
  assert.equal(links[1].attributes.has("tabindex"), false);
  fail = true;
  await context.updateLiveLinks();
  assert.ok(links.every((link) => !link.href && link.attributes.get("aria-disabled") === "true"));
});
