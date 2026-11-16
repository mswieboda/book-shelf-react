# react-practice

Vite + React 19 + TypeScript + Tailwind v4: an interview-prep sandbox.

**Start here → [CHALLENGE.md](CHALLENGE.md)** (build "Shelf", a reading-list app, milestone by milestone)

- [docs/PRIMER.md](docs/PRIMER.md): modern React architecture cheat sheet (state kinds, data fetching, TanStack Query, Context vs Zustand, React 19)
- [docs/API.md](docs/API.md): the backend contract (mocked with MSW for now) + Open Library

## Scripts

- `npm run dev`: start the dev server (the fake `/api` backend starts automatically)
- `npm run build`: type-check and build for production
- `npm run lint`: run ESLint
- `npm run preview`: preview the production build (no fake backend here; it's dev-only)

## The fake backend

`src/mocks/` is a pretend server built with [MSW](https://mswjs.io). In dev, a service worker answers `/api/*` requests; every other request (e.g. Open Library) goes to the real network. App code should never import from `src/mocks/`; talk to it with `fetch`, the same way you'll talk to the real Node backend later.
