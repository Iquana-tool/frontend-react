import { defineConfig, loadEnv } from "vite";
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
 *
 * The unprefixed knobs below (PUBLIC_URL, PORT, ALLOWED_HOSTS,
 * CHOKIDAR_USEPOLLING) come from `loadEnv` rather than `process.env` directly.
 * Vite only reads the `.env` files *after* this config resolves, so a plain
 * `process.env.X` sees the shell and nothing else — putting the variable in
 * `.env.local` had no effect at all. `loadEnv` with an empty prefix reads the
 * same `.env` chain for this Node-side config, with the shell still winning over
 * the files. It does not widen what reaches client code: that is `envPrefix`,
 * still the default `VITE_`.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    base: env.PUBLIC_URL || "/",

    server: {
      // PORT is exported by iquana.sh from the port chosen during installation;
      // CRA read it natively, Vite does not, so it is wired through explicitly.
      // Without this the installer's frontend-port question had no effect and
      // iquana.sh would wait for a port the dev server never bound.
      // Falls back to the port CRA used, which the deployment scripts and the
      // docker-compose dev service both assume.
      port: Number(env.PORT) || 3000,
      // Bind on all interfaces so the dev container -- and other machines on the
      // network -- can reach the dev server.
      host: true,
      // Vite refuses any request whose Host header is not an IP address, localhost
      // or a listed name, as protection against DNS rebinding. Reaching the tool
      // from another PC by hostname therefore returned a bare 403 ("Blocked
      // request. This host is not allowed.") even though the port was bound on
      // every interface -- the same URL by IP worked, which is what made the
      // failure look like DNS rather than Vite.
      //
      // ALLOWED_HOSTS is a comma-separated list of names this machine answers to,
      // set in .env.local (or the shell). Unset means the empty list, i.e. only
      // localhost and bare IPs -- reaching the tool by hostname then needs the
      // name added here. Set ALLOWED_HOSTS=true to accept any name -- convenient
      // behind a reverse proxy that already terminates the hostname, but it gives
      // up the rebinding check, so prefer listing names.
      allowedHosts:
        env.ALLOWED_HOSTS === "true"
          ? true
          : (env.ALLOWED_HOSTS || "")
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean),
      // webpack-dev-server picked CHOKIDAR_USEPOLLING up on its own; Vite needs it
      // wired explicitly. The docker-compose dev service sets it because a
      // bind-mounted volume delivers no inotify events from a non-Linux host.
      watch: env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true } : undefined,
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
  };
});
