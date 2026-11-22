# Backend setup guide (Part 2)

How to install, configure and run everything for [Part 2 of the challenge](../CHALLENGE.md#part-2-the-backend-node-gateway--ruby-microservice): Postgres in Docker, the Node gateway in `server/`, and the Rails + Grape Reviews service in `services/reviews/`.

- **Section 1** is a one-time machine setup. You can do it any time.
- **Sections 2–4** are done when you reach the milestone they're tagged with.
- **Sections 5–8** are day-to-day reference.

Written for macOS on Apple Silicon, using the tools already on this machine: **Homebrew**, **fnm** (Node), **asdf** (Ruby) and **Docker Desktop**.

> **Status (2026-11-20): the setup work below is already done.**
> - Section 1: the toolchain is installed and pinned.
> - Section 2: Postgres is in Docker, with the `shelf` and `shelf_test` databases.
> - Sections 3.1–3.2: the `server/` scaffold, with Express 5 and `GET /healthz`.
> - Sections 4.1–4.3: `services/reviews/`, with Grape, RSpec and FactoryBot added, `database.yml` configured, and `bin/dev` on port 4001.
>
> Still yours to do when you reach them: 3.3 (Vite proxy + MSW flag, B1), 3.4 (Prisma, B2) and 3.5 (Vitest, B3). The rest of the guide is reference.

---

## At a glance

| Piece | Version | Managed by | Port | Pinned in |
|---|---|---|---|---|
| React app (Vite) | — | npm | **5173** | `package.json` |
| Node gateway | Node **24 LTS**, Express 5 | fnm | **4000** | `.node-version` (repo root) |
| Reviews service | Ruby **3.4.12**, Rails **8.1**, Grape **4.x** | asdf | **4001** | `.tool-versions` (repo root) |
| Postgres | **17** | Docker Compose | **5432** | `docker-compose.yml` |

**Databases** (all on the one Postgres container):

| Database | Used by | Created by |
|---|---|---|
| `shelf` | Node, in dev | Docker init script (B0) |
| `shelf_test` | Node, in tests (B3) | Docker init script (B0) |
| `reviews_development` | Rails, in dev | `bin/rails db:prepare` (B4) |
| `reviews_test` | Rails, in tests | `bin/rails db:prepare` (B4) |

Postgres user/password in dev is `postgres` / `postgres`. These are local-only credentials and fine to commit in example files.

**Why Node 24 and not 26?** Both are LTS. 24 has been out longer, so library support is the safest, and the B7 Dockerfile will use `node:24-slim`, so dev matches the container. 26 would very likely work too. Just keep dev and Docker on the same version.

**Why Postgres 17 and not 18?** The Postgres 18 Docker image changed where data is stored (the volume path), and most tutorials and compose files still assume 17. You'd gain nothing here by upgrading.

---

## 1. One-time machine setup (any time)

### 1.1 Node 24 via fnm

```sh
fnm install 24
cd ~/code/interviewing/book-shelf-react
echo "24" > .node-version     # pins the repo root (frontend)
echo "24" > server/.node-version
fnm use                       # → Using Node v24.x
node -v
```

> **Why the second file?** This machine sets `FNM_VERSION_FILE_STRATEGY=local`, which means fnm only reads `.node-version` from the **current** directory, not parent directories. Without its own copy, `cd server` wouldn't switch to Node 24. (asdf does search parent directories, so the one root `.tool-versions` covers `services/reviews/`.)

To have fnm switch versions automatically when you `cd`, check that your shell init has `--use-on-cd`:

```sh
eval "$(fnm env --use-on-cd --shell zsh)"
```

Otherwise run `fnm use` whenever you enter the repo. Vite 8 runs fine on Node 24, so the frontend isn't affected.

### 1.2 Ruby 3.4 via asdf

Ruby 3.4.12 is already installed. Pin it for the repo:

```sh
cd ~/code/interviewing/book-shelf-react
asdf set ruby 3.4.12          # writes .tool-versions in the current directory
ruby -v                       # → ruby 3.4.12
```

`asdf set` is the asdf 0.16+ command (it used to be `asdf local`). Your `~/.asdfrc` has `legacy_version_file = yes`, so the `.ruby-version` that `rails new` generates will be respected as well.

**Why 3.4 and not 4.0?** 4.0 is installed, but it's only about a year old. 3.4 is what most Ruby/Rails codebases you'd join are on right now.

### 1.3 Rails

```sh
gem install rails -v '~> 8.0'   # latest 8.x, never a future 9.0
asdf reshim ruby                # creates the ~/.asdf/shims/rails shim if it's missing
rehash                          # clears zsh's cached command locations (see note)
rails -v                        # → Rails 8.x.y
```

> **"Rails is not currently installed on this system… `sudo gem install rails`"**: that's macOS's stub at `/usr/bin/rails`, not your asdf Ruby. If you ran `rails` before its shim existed, zsh cached the `/usr/bin` location, and `cd` or `reshim` won't clear it. Run `rehash` (or `hash -r`), or open a new terminal tab. Never follow the stub's `sudo gem install` advice, because that installs into the system Ruby. `which -a rails` should list `~/.asdf/shims/rails` first.

### 1.4 libpq (`psql` and the `pg` gem)

You don't need a local Postgres **server** (that's Docker's job). You do want the Postgres **client library**. It gives you `psql` and `pg_config`, which the `pg` gem uses when it builds.

```sh
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc   # libpq is "keg-only"
exec zsh
psql --version
```

### 1.5 Docker Desktop

Docker Desktop is already installed (with Docker 29 and Compose v5). Open it from Applications and wait for "Engine running". Then:

```sh
docker info --format '{{.ServerVersion}}'   # prints a version, not "Cannot connect…"
docker compose version
```

Recommended Docker Desktop settings: **General → Start Docker Desktop when you sign in**, and **Resources → Memory**: 4 GB is plenty for this project.

### 1.6 Commit the pins

```sh
git add .node-version .tool-versions
git commit -m "chore: pin Node 24 and Ruby 3.4.12"
```

---

## 2. Postgres in Docker (B0)

B0 asks you to write these files yourself. Try first, then compare with the reference below.

**Files:**
```
docker-compose.yml
docker/postgres/01-create-databases.sql
```

<details><summary>Reference: <code>docker-compose.yml</code> (Postgres only, for B0)</summary>

```yaml
# No top-level `version:` key. Compose v2+ ignores it and warns.
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  pgdata:
```
</details>

<details><summary>Reference: <code>docker/postgres/01-create-databases.sql</code></summary>

```sql
-- Runs once, the first time the pgdata volume is created.
-- Rails creates its own reviews_* databases in B4, so they aren't listed here.
CREATE DATABASE shelf;
CREATE DATABASE shelf_test;
```
</details>

**Run and verify:**

```sh
docker compose up -d
docker compose ps                                   # postgres → "healthy"
docker compose exec postgres psql -U postgres -l    # lists shelf, shelf_test
psql postgresql://postgres:postgres@localhost:5432/shelf -c 'select 1'   # from your Mac
```

**Optional GUI:** TablePlus, Postico or DBeaver, connecting to `localhost:5432` as `postgres` / `postgres`.

---

## 3. Node gateway scaffold (B0–B2)

### 3.1 Create the package (B0)

```sh
mkdir -p server/src && cd server
npm init -y
npm pkg set type=module
npm i express@5 zod pino pino-http
npm i -D typescript tsx @types/node @types/express pino-pretty
npx tsc --init
```

`server/` has its **own** `package.json` and `node_modules`, completely separate from the React app. It's not an npm workspace. That keeps it simple, and it's how it would look as a separate repo.

**Settings to change in `tsconfig.json`** (leave the rest as generated):

| Option | Value | Why |
|---|---|---|
| `module` / `moduleResolution` | `NodeNext` | Real Node ESM resolution |
| `target` | `ES2023` | Node 24 supports it all |
| `rootDir` / `outDir` | `src` / `dist` | `tsc` builds to `dist/` for B7 |
| `strict` | `true` | — |
| `verbatimModuleSyntax` | `true` | Forces `import type`, which avoids surprises with ESM |

> **NodeNext gotcha:** relative imports need the **`.js`** extension, even in `.ts` files: `import { app } from './app.js'`. `tsx` forgives a missing extension, but compiled `node dist/index.js` does not, so you'd only find out in Docker.

**Scripts** (`server/package.json`):

```json
"scripts": {
  "dev": "tsx watch --env-file=.env src/index.ts",
  "build": "tsc",
  "start": "node --env-file=.env dist/index.js",
  "typecheck": "tsc --noEmit",
  "test": "vitest"
}
```

`--env-file` is built into Node (20.6+), so you don't need the `dotenv` package for the server itself.

### 3.2 Environment files (B0)

Commit an **example** file and keep the real ones out of git.

`server/.env.example`:
```sh
PORT=4000
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shelf
REVIEWS_URL=http://localhost:4001        # used from B5 on
```

`server/.env.test.example`:
```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shelf_test
REVIEWS_URL=http://reviews.test           # deliberately fake: B5 tests mock it with MSW, so they can never hit the real Ruby service
LOG_LEVEL=silent
```

```sh
cp .env.example .env && cp .env.test.example .env.test
```

Add to the **root** `.gitignore`:
```gitignore
# env files (commit the *.example versions only)
.env
.env.test
```

### 3.3 Point the frontend at it (B1)

- Proxy in `vite.config.ts`: `server: { proxy: { '/api': 'http://localhost:4000' } }`.
- MSW behind a flag in `main.tsx` (B1 asks you to write this).
- To switch back to the fake backend for a session, create **`.env.development.local`** in the repo root (already gitignored by `*.local`):
  ```sh
  VITE_USE_MOCKS=true
  ```
  Then restart `npm run dev`.

> If `/api` calls still show "(from service worker)" in the Network tab after turning mocks off: DevTools → Application → Service workers → **Unregister**, then hard reload.

### 3.4 Prisma (B2)

```sh
cd server
npm i -D prisma
npm i @prisma/client @prisma/adapter-pg
npx prisma init --datasource-provider postgresql
```

> **Prisma 7 (late 2025) changed the setup.** Most blog posts and 2022/23-era codebases use Prisma 4/5, and the two look different:
>
> | Prisma 4/5 (what job codebases have) | Prisma 7 (what you'll install) |
> |---|---|
> | `url = env("DATABASE_URL")` in `schema.prisma` | DB URL lives in **`prisma.config.ts`** |
> | Client generated into `node_modules/.prisma` | Generator needs an explicit **`output`** path; you import from there |
> | `new PrismaClient()` | `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` |
> | `.env` loaded automatically by the CLI | The CLI doesn't load `.env`; `prisma.config.ts` must load it |
>
> Follow what `prisma init` generates and the current docs at prisma.io. Knowing both styles is useful in interviews: "We're on Prisma 5, here's what 7 changes."

Day-to-day commands:

```sh
npx prisma migrate dev --name init   # create + apply a migration (dev DB)
npx prisma db seed                   # run the seed script (configure it in prisma.config.ts)
npx prisma studio                    # browse data in the browser
npx prisma migrate reset             # drop, re-migrate, re-seed (dev only!)
```

Apply migrations to the **test** database once, and again after every new migration:

```sh
node --env-file=.env.test ./node_modules/.bin/prisma migrate deploy
```

Or add it as an npm script: `"db:test:migrate": "node --env-file=.env.test ./node_modules/.bin/prisma migrate deploy"`. If your `prisma.config.ts` loads `.env` itself, make sure it doesn't overwrite a `DATABASE_URL` that's already set.

### 3.5 Tests (B3)

```sh
npm i -D vitest supertest @types/supertest
```

Load `.env.test` **before** anything imports your Prisma client. The simplest way is a Vitest setup file whose first line is `process.loadEnvFile('.env.test')` (built into Node 21.7+). Test files then import `app` **without** calling `listen`.

> Vitest runs test files in parallel. When several files share one `shelf_test` database and truncate it, you get flaky tests. Use `fileParallelism: false` in `server/vitest.config.ts` (the simplest fix), or give each worker its own database.

---

## 4. Rails + Grape Reviews service (B4)

### 4.1 Generate the app

Run from the **repo root** so `.tool-versions` picks up Ruby 3.4.12:

```sh
rails new --help | less          # check the flags against your Rails version first

rails new services/reviews \
  --api \
  --database=postgresql \
  --skip-test \
  --skip-kamal \
  --skip-solid \
  --skip-action-mailbox \
  --skip-action-text \
  --skip-active-storage \
  --skip-action-cable
```

| Flag | Why |
|---|---|
| `--api` | API-only middleware stack, no views/assets |
| `--skip-test` | RSpec instead of Minitest |
| `--skip-kamal` | Kamal is Rails' deploy tool; Docker Compose covers this project |
| `--skip-solid` | No Solid Cache/Queue/Cable. They need extra databases this service doesn't use |
| `--skip-action-*`, `--skip-active-storage` | Features a reviews API doesn't need |

The Dockerfile is kept (you'll use it in B7), and so are RuboCop and Brakeman.

**Nested git repo:** `rails new` may run `git init` inside `services/reviews`. Remove it so the whole project stays one repo (but keep Rails' generated `.gitignore`):

```sh
ls -a services/reviews | grep -x .git && rm -rf services/reviews/.git
```

### 4.2 Gems

```sh
cd services/reviews
bundle add grape grape-entity
bundle add rspec-rails factory_bot_rails --group "development, test"
bin/rails generate rspec:install
```

No `rack-cors`: the browser never calls this service, only Node does (server to server). Be ready to say why that means you don't need CORS.

### 4.3 Database config

Keep Rails' default database names (`reviews_development`, `reviews_test`) and supply the connection details from the environment. In `config/database.yml`, inside the `default: &default` block:

```yaml
  host: <%= ENV.fetch("DB_HOST", "localhost") %>
  port: <%= ENV.fetch("DB_PORT", 5432) %>
  username: <%= ENV.fetch("DB_USER", "postgres") %>
  password: <%= ENV.fetch("DB_PASSWORD", "postgres") %>
```

The defaults point at the Docker Postgres for local dev. In B7, compose sets `DB_HOST=postgres`.

> **Why not just `DATABASE_URL`?** If `DATABASE_URL` is exported in your shell, Rails uses it for **every** environment, including `test`. Then `bin/rails spec` can truncate your **dev** database. Separate host/user settings plus per-environment database names avoid that.

```sh
bin/rails db:prepare                 # creates reviews_development + reviews_test, runs migrations
bin/dev                              # = bin/rails server -p 4001 (Rails' default is 3000)
curl -i localhost:4001/up            # Rails 8 built-in health check → 200
bin/rails zeitwerk:check             # run after you add app/api (see the B4 hint)
bundle exec rspec
```

---

## 5. Day-to-day: starting everything

Before B7, use one terminal tab per process:

```sh
# tab 1 — database (leave it running; it survives restarts of everything else)
docker compose up -d

# tab 2 — Node gateway (:4000)
cd server && npm run dev

# tab 3 — Reviews service (:4001), from B4 on
cd services/reviews && bin/dev

# tab 4 — React app (:5173)
npm run dev
```

**Optional: one command for everything.** Add `concurrently` to the root and a script:

```sh
npm i -D concurrently
```

```json
"dev:all": "concurrently -k -n web,api,reviews -c cyan,green,magenta \"npm run dev\" \"npm --prefix server run dev\" \"cd services/reviews && bin/dev\""
```

After B7 (everything in Compose):

```sh
docker compose up --build        # Postgres + gateway + reviews; Ctrl-C to stop
npm run dev                      # Vite still runs on your Mac and proxies to :4000
```

---

## 6. Verify it all works

Run these top to bottom. Each one depends on the ones before it.

| Check | Command | Expect |
|---|---|---|
| Node version | `node -v` (in repo) | `v24.x` |
| Ruby version | `ruby -v` (in repo) | `3.4.12` |
| Rails | `rails -v` | `Rails 8.x` |
| Docker engine | `docker info --format '{{.ServerVersion}}'` | a version number |
| Postgres healthy | `docker compose ps` | `healthy` |
| Databases exist | `psql postgresql://postgres:postgres@localhost:5432/postgres -c '\l'` | `shelf`, `shelf_test` (+ `reviews_*` after B4) |
| Gateway up | `curl -s localhost:4000/healthz` | `{"ok":true}` |
| Contract (B1+) | `curl -s localhost:4000/api/shelf \| head -c 300` | JSON array of books |
| Reviews up (B4+) | `curl -i localhost:4001/up` | `200` |
| Reviews API (B4+) | `curl -sg 'localhost:4001/v1/reviews?shelf_book_ids[]=x'` (`-g` stops curl treating `[]` as a pattern) | `[]` |
| Through the proxy | `curl -s localhost:5173/api/shelf \| head -c 300` | same JSON as the gateway |
| Ruby down (B5+) | stop Rails, reload the app | shelf still renders, without ratings |

---

## 7. Resetting things

| Want to… | Run |
|---|---|
| Restore the seed books (app level) | `curl -X POST localhost:4000/api/_reset` |
| Rebuild the Node dev DB from migrations + seed | `cd server && npx prisma migrate reset` |
| Rebuild the Reviews dev DB | `cd services/reviews && bin/rails db:reset` |
| Stop containers, **keep** data | `docker compose down` |
| Wipe **all** Postgres data (re-runs the init script) | `docker compose down -v` |
| Free disk space Docker is using | `docker system df`, then `docker system prune` |

---

## 8. Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop isn't running. Open it and wait for "Engine running". |
| `port 5432 is already allocated` | Another Postgres is running locally (`lsof -i :5432`). Stop it (`brew services stop postgresql@…`), or map `"5433:5432"` and use port 5433 in your URLs. |
| `database "shelf" does not exist` | The init script only runs on a **new** volume. `docker compose down -v && docker compose up -d`. |
| `No version is set for command ruby` | No `.tool-versions` in this directory or its parents. See 1.2. |
| `rails: command not found` after `gem install` | `asdf reshim ruby`, then `rehash` |
| `Rails is not currently installed on this system` | zsh cached the macOS stub `/usr/bin/rails`. Run `rehash` or open a new tab (see 1.3). |
| `pg` gem fails to build (`pg_config` / `libpq-fe.h` not found) | `brew install libpq`, then `bundle config build.pg --with-pg-config=/opt/homebrew/opt/libpq/bin/pg_config` and `bundle install` again. |
| Wrong Node version in `server/` | `fnm use` (or enable `--use-on-cd`, see 1.1). |
| `ERR_MODULE_NOT_FOUND` running `dist/` but `tsx` works | Missing `.js` extension in a relative import (NodeNext; see 3.1). |
| Prisma tutorial code doesn't match your files | Pre-v7 tutorial. See the table in 3.4. |
| `prisma migrate` complains about OpenSSL inside the Docker image | Slim images lack it. In the Dockerfile: `apt-get update && apt-get install -y openssl`. |
| Tests wipe your dev data | The test run read `.env` instead of `.env.test` (Node), or `DATABASE_URL` leaked into `RAILS_ENV=test` (Rails, see 4.3). |
| Random test failures that pass when run alone | Test files running in parallel against one test DB. See 3.5. |
| `/api` still answered by MSW after turning mocks off | Old service worker. Unregister it (see 3.3). |
| Vite proxy returns `502` / `ECONNREFUSED` | The gateway isn't running on :4000. |
| **B7:** Rails says `Blocked hosts: reviews` | Host authorization in the **development** environment. Add `config.hosts << "reviews"` in `config/environments/development.rb`, or run the container in production mode. |
| **B7:** Node gets `301` redirects to `https://` from Rails | Check `config.force_ssl` / `config.assume_ssl` in `production.rb`. This internal service speaks plain HTTP inside the Docker network, so it shouldn't redirect. Note: a curl healthcheck can still look "healthy", because 3xx isn't a failure. |
| **B7:** The Reviews container listens on port 80, not 4001 | The generated Dockerfile runs Puma behind **Thruster**, which listens on 80. Either map `"4001:80"` and use `http://reviews:80` inside the network, or change the `CMD` to run `bin/rails server -b 0.0.0.0 -p 4001`. |
| **B7:** Rails exits with `Missing secret_key_base` | The production environment needs one. Set `SECRET_KEY_BASE` in compose (any long random string; `bin/rails secret` prints one). |
| **B7:** Node in Docker can't reach `localhost:4001` | Inside the Docker network, `localhost` is the container itself. Use the service name: `REVIEWS_URL=http://reviews:4001`. |
| Compose warns `version is obsolete` | Delete the top-level `version:` line. |
