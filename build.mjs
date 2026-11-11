import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function buildSite(source, destination, revision = "unknown") {
  const files = ["index.html", "index.css", "index.js", "data.json"];
  async function collect(directory) {
    for (const entry of await readdir(join(source, directory), { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await collect("images");
  files.sort();
  const contents = new Map(await Promise.all(files.map(async (path) => [path, await readFile(join(source, path))])));
  const hash = createHash("sha256").update(revision).update(await readFile(fileURLToPath(import.meta.url)));
  for (const [path, bytes] of contents) hash.update(path).update("\0").update(bytes);
  const prefix = `/assets/${hash.digest("hex").slice(0, 20)}/`;
  const assetUrl = (path) => contents.has(path) ? prefix + path : path;
  const data = JSON.parse(contents.get("data.json"));
  data.photo = assetUrl(data.photo);
  data.photoAlt = assetUrl(data.photoAlt);
  for (const project of data.projects) project.preview = assetUrl(project.preview);
  contents.set("data.json", JSON.stringify(data));
  contents.set("index.js", contents.get("index.js").toString().replace('fetch("data.json")', `fetch("${prefix}data.json")`));
  const manifestPath = "images/favicon_io/site.webmanifest";
  const manifest = JSON.parse(contents.get(manifestPath));
  for (const icon of manifest.icons) icon.src = assetUrl(`images/favicon_io/${icon.src.split("/").pop()}`);
  contents.set(manifestPath, JSON.stringify(manifest));
  const html = contents.get("index.html").toString().replace(/(href|src)="([^"]+)"/g,
    (match, attribute, path) => contents.has(path) ? `${attribute}="${assetUrl(path)}"` : match);

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const [path, bytes] of contents) {
    if (path === "index.html") continue;
    for (const output of [join(destination, path), join(destination, prefix.slice(1), path)]) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
  }
  await writeFile(join(destination, "index.html"), html);
  await writeFile(join(destination, "version.txt"), revision + "\n");
  return prefix;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prefix = await buildSite(resolve("."), resolve("dist"), process.env.GIT_COMMIT);
  console.log(`Built portfolio assets at ${prefix}`);
}
