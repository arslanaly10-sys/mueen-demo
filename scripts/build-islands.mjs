// Bundles the landing page's React islands into public/assets/bits/ (run before next build).
import { build } from "esbuild";

await build({
  entryPoints: ["src/islands/landing.tsx"],
  outdir: "public/assets/bits",
  bundle: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
