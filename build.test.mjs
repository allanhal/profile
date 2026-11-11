import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildSite } from "./build.mjs";

test("build versions every asset and updates all HTML, data, JS and manifest references", async () => {
  const output = await mkdtemp(join(tmpdir(), "portfolio-build-"));
  try {
    const prefix = await buildSite(process.cwd(), output, "test-revision");
    assert.match(prefix, /^\/assets\/[a-f0-9]{20}\/$/);
    const html = await readFile(join(output, "index.html"), "utf8");
    const paths = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]).filter((path) => path.startsWith("/"));
    for (const path of paths) {
      assert.ok(path.startsWith(prefix), path);
      await readFile(join(output, path));
    }
    const javascript = await readFile(join(output, prefix, "index.js"), "utf8");
    assert.ok(javascript.includes(`fetch("${prefix}data.json")`));
    assert.ok(javascript.includes('fetch("/api/live-status"'));
    const data = JSON.parse(await readFile(join(output, prefix, "data.json"), "utf8"));
    for (const path of [data.photo, data.photoAlt, ...data.projects.map((project) => project.preview)]) {
      assert.ok(path.startsWith(prefix), path);
      await readFile(join(output, path));
    }
    const manifest = JSON.parse(await readFile(join(output, prefix, "images/favicon_io/site.webmanifest"), "utf8"));
    for (const icon of manifest.icons) await readFile(join(output, icon.src));
    assert.equal(await readFile(join(output, "version.txt"), "utf8"), "test-revision\n");
    assert.ok(!(await readdir(output)).includes(".env"));
    assert.equal(await buildSite(process.cwd(), output, "test-revision"), prefix);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("source changes invalidate browser URLs and a rebuild removes old output", async () => {
  const root = await mkdtemp(join(tmpdir(), "portfolio-invalidation-"));
  try {
    const source = join(root, "source");
    const output = join(root, "dist");
    await mkdir(source);
    for (const path of ["index.html", "index.css", "index.js", "data.json", "images"]) await cp(path, join(source, path), { recursive: true });
    const first = await buildSite(source, output, "same-revision");
    await writeFile(join(source, "index.css"), "body { color: red; }");
    const second = await buildSite(source, output, "same-revision");
    assert.notEqual(first, second);
    assert.deepEqual(await readdir(join(output, "assets")), [second.split("/")[2]]);
    assert.ok((await readFile(join(output, "index.html"), "utf8")).includes(second));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
