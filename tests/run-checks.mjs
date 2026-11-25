// Bundles each tests/*.check.ts with esbuild and runs it in Node (no extra test framework).
import { build } from "esbuild";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

for (const f of readdirSync("tests").filter((n) => n.endsWith(".check.ts"))) {
  const out = `.next/cache/${f.replace(".ts", ".mjs")}`;
  await build({ entryPoints: [`tests/${f}`], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "warning", alias: { "server-only": "./tests/empty.js" } });
  execFileSync("node", [out], { stdio: "inherit" });
}
