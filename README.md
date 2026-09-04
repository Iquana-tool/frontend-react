# IQUANA frontend

The web UI for [IQUANA](https://github.com/Iquana-tool/iquana-tool) — **I**ntelligent
**QU**antification, **AN**notation and **A**nalysis, a tool for AI-assisted segmentation,
annotation and quantification of scientific image datasets, built at
[DFKI](https://www.dfki.de/).

A React 18 single-page app built with Vite, talking to the
[backend](https://github.com/Iquana-tool/backend) over REST and a WebSocket.

- **User documentation:** https://iquana-tool.github.io/docs/
- **Installing the whole tool:** do not clone this repo by hand — run the
  [installer](https://github.com/Iquana-tool/iquana-tool), which sets up every component and
  wires their configuration together.
- **Issues:** all IQUANA bug reports and feature requests go to
  [iquana-tool/issues](https://github.com/Iquana-tool/iquana-tool/issues/new/choose).

---

## What the UI covers

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | Instance identity, sign-in, entry points |
| Datasets | `/datasets` | Dataset list, creation, upload |
| Data management | `/dataset/:datasetId/datamanagement` (+ `/images`, `/labels`) | Gallery, image metadata, label hierarchy |
| Annotation | `/dataset/:datasetId/annotate/:imageId` | The annotation canvas |
| Viewer | `/dataset/:datasetId/view/:imageId` | Read-only annotation view |
| Review | `/dataset/:datasetId/review` | Review queue — accept, reject, send back for correction |
| Correction | `/dataset/:datasetId/correct` | Work through instances sent back by review |
| Quantification | `/dataset/:datasetId/quantifications` (+ `/image/:imageId`) | Metric explorer, per-image tables, export |
| Training | `/dataset/:datasetId/training` | Per-label instance-segmentation training runs |
| Batch inference | `/dataset/:datasetId/inference` | Dataset-wide model runs and progress |
| Access | `/dataset/:datasetId/access` | Members, invites, review policy, task assignment |
| Model zoo | `/models` | Browse available models, capabilities and performance stats |
| Admin | `/admin/users` | User management and instance settings |

### The annotation canvas

Three workflow tabs — **Calibrate**, **Annotate**, **Review**.

- **Calibrate** — draw a scale line and give it a physical unit, or colour-calibrate from
  patches or a greyscale card.
- **Annotate** — four prompt types (points, boxes, polygons, freedraw). *Run AI* invokes a
  prompted-segmentation model, *Suggest similar* an instance-suggestion model, and boxes and
  freedraw shapes can be added as objects directly. The **instant switch** (*Nothing* /
  *Run AI* / *Add manually*) sets what happens the moment a prompt lands, which is what
  removes most of the clicking. Outlines are editable three ways: AI refinement from extra
  prompts, dragging outline vertices, or redrawing a section with a polygon or freedraw.
  Selecting an object enters **focus mode**, zooming into it and nesting everything drawn
  next underneath it — arbitrarily deep.
- **Review** — every object not yet accepted, with accept / reject / send-back actions.

---

## Setup

### Prerequisites

- **Node.js ≥ 22.12** (see `.nvmrc`; required by Vite 8)
- **[bun](https://bun.sh)** — the package manager of record; `bun.lock` is the committed
  lockfile
- A running [backend](https://github.com/Iquana-tool/backend)

### Install and run

```bash
bun install
cp env.example .env.local
bun run dev
```

| Script | What it does |
|---|---|
| `bun run dev` | Vite dev server with HMR, on `PORT` (default 3000) |
| `bun run build` | Production bundle into `build/` |
| `bun run preview` | Serve the built bundle |
| `bun run test` | Vitest suite (jsdom, globals enabled) |

To serve the app from a path prefix behind a reverse proxy, set `PUBLIC_URL` at build time:

```bash
PUBLIC_URL=/iquana bun run build
```

---

## Configuration

Only variables prefixed `VITE_` reach client code. The unprefixed ones are read in Node at
build/serve time by `vite.config.mjs` (through `loadEnv`, so `.env.local` works for them too).

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | client | Backend base URL — scheme, host and port only, **no** trailing `/api` |
| `VITE_WS_URL` | client | WebSocket URL; derived from the API base URL when unset |
| `PORT` | dev server | Port the dev server binds (default 3000) |
| `PUBLIC_URL` | build | Path prefix the app is served under; becomes Vite's `base` |
| `ALLOWED_HOSTS` | dev server | Comma-separated hostnames the dev server answers to |
| `CHOKIDAR_USEPOLLING` | dev server | File polling, needed for bind-mounted source on non-Linux hosts |

### Reaching the dev server from another machine

Vite refuses any request whose `Host` header is not `localhost` or a bare IP, as
DNS-rebinding protection. Reaching the tool from another PC *by name* therefore returns a
bare `403 Blocked request` even though the port is bound on every interface — the same URL
by IP works, which is what makes it look like a DNS problem. List the name in
`ALLOWED_HOSTS`, or set `ALLOWED_HOSTS=true` to accept any name (only behind a reverse proxy
that already terminates the hostname; it gives up the rebinding check).

---

## Project structure

```
src/
├── api/                # One module per backend area (datasets, contours, labels,
│                       #   masks, models, inference, reviews, calibration, auth, ...)
│                       #   config.js holds API_BASE_URL and BASE_PATH
├── components/
│   ├── annotationPage/ # Canvas, layout, modals, workspace
│   ├── auth/           # Login, Register, ProtectedRoute, Can
│   ├── datasets/       # Cards, gallery, access, training
│   ├── inference/      # Label/model planner, progress, write-mode selector
│   ├── models/         # Model cards, detail panel, training modal
│   ├── quantification/ # Metric cards, label tree, Perspective explorer
│   ├── review/         # Review setup and session
│   ├── viewer/, ui/, documentation/, correction/
├── pages/              # One component per route
├── stores/             # Zustand store, split into slices (canvas, objects, images,
│                       #   history, models, websocket, focus mode, workspace, ...)
├── hooks/              # Canvas interaction, AI segmentation, sessions, permissions, ...
├── contexts/           # Auth, Dataset, Toast, Correction
├── services/           # WebSocket transport + annotation-session protocol
├── utils/              # Contour geometry, label hierarchy, quantification, exports
└── styles/             # Theme tokens, workspace and Perspective CSS
```

### State and transport

Client state lives in a **[zustand](https://github.com/pmndrs/zustand)** store composed of
slices under `src/stores/slices/`. The annotation canvas is **konva** / **react-konva**;
styling is **Tailwind CSS v3** utilities with a few MUI components.

Annotation is a stateful session over a WebSocket (`src/services/annotationSession.js`), not
a series of REST calls: prompts, model switches, object updates and image switches are all
messages on the one connection.

### Perspective is lazily loaded

The quantification explorer is built on `@perspective-dev` v5. It is reached only through
`React.lazy()` (see `src/components/quantification/QuantificationExplorer.jsx`) so the engine
and its plugins — several MB — stay out of the main bundle. Perspective v5 requires Vite;
it cannot run under webpack, which is part of why this app migrated.

---

## In-app documentation

`/docs` renders a short in-app guide, but the canonical user documentation is the MkDocs
site at **https://iquana-tool.github.io/docs/**. Help links throughout the app point there;
prefer adding to the docs site over extending `src/components/documentation/`.

---

## Docker

`Dockerfile` builds the production bundle and serves it with nginx; `Dockerfile.dev` runs
the Vite dev server. `docker-compose.yml` defines both:

```bash
docker compose up --build          # production image on :3000
docker compose up dev              # dev server on :3001
```

The `VITE_*` variables are read at **build** time (the bundle is baked, then served
statically), so setting them under `environment:` for the production service has no effect —
they must be passed as build args.

---

## CI

`.github/workflows/` still contains the pipeline inherited from the pre-Vite app: it uses
npm with `package-lock.json` and Node 18, while the project now builds with bun and needs
Node ≥ 22.12. **Treat those workflows as stale** — they do not reflect how the app is built
today, and installation is done by the [installer](https://github.com/Iquana-tool/iquana-tool)
rather than by the Docker Hub deploy they describe.

---

## Related repositories

| Repo | Role |
|---|---|
| [iquana-tool](https://github.com/Iquana-tool/iquana-tool) | Installer, launcher and the issue tracker for all of IQUANA |
| [backend](https://github.com/Iquana-tool/backend) | REST + WebSocket API, database, exports |
| [ai-service](https://github.com/Iquana-tool/ai-service) | Model inference and training |
| [iquana-toolbox](https://github.com/Iquana-tool/iquana-toolbox) | Shared Pydantic schemas and registries |

---

## License

AGPL-3.0 — see [LICENSE](LICENSE).
