# book-shelf

"Book Shelf" - a reading-list web app written with Vite + React 19 + TypeScript + Tailwind v4.

**Start here → [CHALLENGE.md](CHALLENGE.md)** (build "Shelf", a reading-list app, milestone by milestone, with axios and a hand-built data layer)

- [docs/PRIMER.md](docs/PRIMER.md): modern React architecture cheat sheet (state kinds, API layering, axios vs fetch, caching concepts, Context vs Zustand vs Redux, React 18/19)
- [docs/API.md](docs/API.md): the backend contract (mocked with MSW for now) + Open Library

## Scripts

- `npm run dev`: start the dev server (the fake `/api` backend starts automatically)
- `npm run build`: type-check and build for production
- `npm run lint`: run ESLint
- `npm run preview`: preview the production build (no fake backend here; it's dev-only)

## The fake backend

`src/mocks/` is a pretend server built with [MSW](https://mswjs.io). In dev, a service worker answers `/api/*` requests; every other request (e.g. Open Library) goes to the real network. App code should never import from `src/mocks/`; talk to it over HTTP with axios, the same way you'll talk to the real Node backend later.
