# CLAUDE.md

## What this repo is

An interview-prep practice app. The user is re-learning React fundamentals and architecture by building **"Shelf"**, a reading-list app, milestone by milestone. **The user writes the app code themselves.**

- `CHALLENGE.md`: milestones M0–M10, with checklists, folded hints and interview questions
- `docs/PRIMER.md`: architecture cheat sheet
- `docs/API.md`: API contract
- `plan/`: the user's own notes, including the M0 component tree

## How to help (coach mode)

- **Review, hint and question; don't solve.** When asked to review a milestone, point at problems and ask interview-style questions instead of writing the fix. Only write app code if explicitly asked.
- Keep reviews proportionate. The user prefers "good enough, keep moving" over exhaustive nitpicks unless they ask for rigor.
- Frame feedback around interview talking points: where state lives (server / URL / local / shared client / form / derived), trade-offs, and what a library would add.

## Decisions already made (don't re-litigate)

- **axios + a hand-built data layer** (`queryCache`, `useApiQuery`, `useApiMutation` in M5–M6), **not TanStack Query**. Reason: the target job's codebase started around 2023, and interviews may probe raw HTTP and caching concepts. The user wants to explain caching, de-duping and invalidation from having built them. TanStack Query appears only as a comparison stretch goal.
- Raw `fetch` is deferred to a later mini-challenge.
- Libraries arrive per milestone: React Router (M7), Zustand (M8), react-error-boundary (M9), Vitest + Testing Library (M10). The user installs them.

## Setup facts

- Vite 8, React 19, TypeScript, Tailwind v4.
- **MSW v3** fakes the backend in dev (`src/mocks/`). Start option is `onUnhandledFrame: 'bypass'` (v3 renamed it from `onUnhandledRequest`). Latency is 0 under Vitest. `src/mocks/node.ts` is for tests.
- Rule: app code never imports from `src/mocks/`; talk to it only over HTTP via axios.
- Mock knobs live in localStorage: `mock:latency`, `mock:failRate`. `POST /api/_reset` restores the seed data.
- **Backend = Part 2 of `CHALLENGE.md` (B0–B7)**, done after the frontend core. Node 24 + Express 5 + TS + zod + pino + Prisma is the gateway/monolith (`server/`). Reviews (rating + notes) gets extracted into **Rails 8 API + Grape** (`services/reviews/`). Postgres uses one database per service, and everything runs under Docker Compose. Soft delete with restore on re-add. Ruby outages: reads degrade, writes fail. GraphQL (Apollo Server + DataLoader) sits on the gateway next to REST. Don't re-litigate these choices.

## Progress

- M0 done (component tree in `plan/component-tree.md`). Next: **M1** (components, props and state with hardcoded data).
- Commits are per milestone: `"M1: ..."`.
- NOTE: this section will not be updated for this agent doc context

