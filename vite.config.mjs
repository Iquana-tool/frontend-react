import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build configuration.
 *
 * Named `.mjs` rather than `.js` so Vite's native config loader reads it as the
 * ES module it is. The alternative — `"type": "module"` in package.json — would
 * force postcss.config.js and tailwind.config.js to be rewritten as ESM too,
 * and those are meant to carry over from the CRA build untouched.
 *
 * `PUBLIC_URL` is read here, in Node, at build time only — it is never exposed
 * to client code, which is why it keeps its unprefixed name rather than
 * becoming a `VITE_` variable. Vite normalises it to a trailing slash and
 * rewrites every asset and index.html reference against it, which is what lets
 * the app be served from a path prefix behind the reverse proxy. Client code
 * reads the same value back as `import.meta.env.BASE_URL` (see
 * `src/api/config.js`, which strips the trailing slash for concatenation).
 */
export default defineConfig({
  plugins: [react()],

  base: process.env.PUBLIC_URL || "/",

  server: {
    // Matches the port CRA used, which the deployment scripts and the
    // docker-compose dev service both assume.
    port: 3000,
    // Bind on all interfaces so the dev container is reachable from the host.
    host: true,
    // webpack-dev-server picked CHOKIDAR_USEPOLLING up on its own; Vite needs it
    // wired explicitly. The docker-compose dev service sets it because a
    // bind-mounted volume delivers no inotify events from a non-Linux host.
    watch: process.env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true } : undefined,
  },

  build: {
    // CRA emitted `build/`; the production Dockerfile, the CI artifact upload
    // and scripts/deploy.sh all reference that path. Keeping the name here is
    // cheaper than changing it in four places.
    outDir: "build",
  },

  test: {
    // The suite was written against Jest and calls `test`/`expect` without
    // importing them, so keep the globals rather than editing every file.
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // Scope discovery to src/. Vitest's default globs would otherwise pick up
    // the checked-out git worktrees under .claude/, which hold stale copies of
    // these same tests and fail against a different revision of the source.
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
