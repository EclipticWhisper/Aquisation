# Aquisation — Architecture

## 1. Overview

Aquisation is a Node.js (Express 5) REST API that provides the authentication layer for an acquisitions platform. It exposes sign-up / sign-in / sign-out endpoints, persists users to PostgreSQL (Neon), issues JWT tokens stored in HTTP-only cookies, and protects traffic with Arcjet (bot detection, shield, and role-based rate limiting).

The project follows a layered, modular architecture with dependency-free path aliases (`#config`, `#controllers`, `#models`, etc.) defined in `package.json`.

## 2. Tech Stack

| Concern        | Technology                                        |
| -------------- | ------------------------------------------------- |
| Runtime        | Node.js 22 (Docker image `node:22-alpine`)        |
| Framework      | Express 5                                         |
| Language       | ESM JavaScript (`"type": "module"`)               |
| Database       | PostgreSQL via Neon (serverless driver)           |
| ORM / Migrations | Drizzle ORM + drizzle-kit                        |
| Validation     | Zod v4                                            |
| Auth           | bcrypt (hashing), jsonwebtoken (JWT), cookie-parser |
| Security       | helmet, cors, Arcjet (shield + bot + rate limit)  |
| Logging        | Winston + morgan                                  |
| Dev tooling    | ESLint, Prettier, Docker Compose, Neon Local      |

## 3. Directory Structure

```
Aquisation/
├── src/
│   ├── app.js                     # Express app assembly (middleware + routes)
│   ├── index.js                   # Entry point: loads dotenv, starts server
│   ├── server.js                  # HTTP listener (host 0.0.0.0, PORT)
│   ├── config/
│   │   ├── Arcjet.js              # Arcjet client (shield + bot detection)
│   │   ├── database.js            # Drizzle + Neon serverless connection
│   │   └── logger.js              # Winston logger instance
│   ├── controllers/
│   │   └── auth.controller.js     # signup / signin / signout handlers
│   ├── middleware/
│   │   ├── auth.middleware.js     # Decodes JWT into req.user (soft)
│   │   └── security.middleware.js # Arcjet shield/bot/rate-limit gate
│   ├── models/
│   │   └── user.model.js          # Drizzle `users` table schema
│   ├── routes/
│   │   └── auth.routes.js         # /api/auth routes
│   ├── services/
│   │   └── auth.service.js        # DB + bcrypt business logic
│   ├── utils/
│   │   ├── cookies.js             # Cookie get/set/clear helpers
│   │   ├── format.js              # Zod error formatter
│   │   └── jwt.js                 # JWT sign/verify wrapper
│   └── validation/
│       └── auth.validation.js     # Zod schemas
├── drizzle/                       # Generated SQL migrations + snapshots
├── postman/                       # Postman workspace exports (gitignored)
├── scripts/dev.sh                 # Local dev bootstrap script
├── Dockerfile                     # Multi-stage (development / production)
├── docker-compose.dev.yml         # Neon Local proxy + app
├── docker-compose.prod.yml        # App only (Neon Cloud external)
├── drizzle.config.js              # drizzle-kit config
├── eslint.config.js               # ESLint flat config
└── .env*                          # Environment files (gitignored)
```

## 4. Request Flow

```
HTTP request
  → helmet()                      # security headers
  → cors()                        # cross-origin policy (currently permissive)
  → express.json() / urlencoded() # body parsing
  → morgan('combined')            # HTTP access log → Winston
  → cookieParser()                # parse cookies
  → / , /health , /api/health     # public routes (no auth, no rate-limit)
  → auth.middleware               # decode JWT token → req.user (soft, no rejection)
  → security.middleware           # Arcjet: shield + bot + sliding-window rate limit
  → /api/auth/*                   # auth routes
  → 404 handler
  → error handler
  → controller → service → db     # business logic
  → response
```

## 5. Modules

### 5.1 Config

- `database.js` — Creates a `neon()` SQL client and wraps it with `drizzle()`. When `NEON_LOCAL=true`, it points the serverless driver at the Neon Local proxy endpoint (`http://neon-local:5432/sql`); otherwise it uses the standard Neon HTTP endpoint from `DATABASE_URL`.
- `Arcjet.js` — Arcjet client with `shield` and `detectBot` (allowing search engines and preview bots). Rules run in `LIVE` mode in production and `DRY_RUN` in development (so local testing is never blocked).
- `logger.js` — Winston with JSON output, file transports (`logs/error.log`, `logs/combined.log`) and a colorized console transport in non-production.

### 5.2 Middleware

- `auth.middleware.js` — Reads the `token` cookie, verifies it, and attaches `req.user`. It never rejects the request on its own; authorization is left to future route guards.
- `security.middleware.js` — Pre-builds three Arcjet clients (admin 20/min, user 10/min, guest 5/min) at module load, then runs `slidingWindow`, `shield`, and `detectBot` rules per request. Returns `403` for denied requests.

### 5.3 Controllers

- `auth.controller.js` — Validates input with Zod, delegates to `auth.service`, signs the JWT, sets the cookie, and maps domain errors to HTTP status codes (409 for duplicate, 401 for invalid credentials).

### 5.4 Services

- `auth.service.js` — `hashPassword`, `comparePassword`, `createUser`, `authenticateUser`. Owns all DB and bcrypt interactions and throws domain errors (`User already exists`, `User not found`, `Invalid credentials`).

### 5.5 Models

- `user.model.js` — Drizzle `pgTable` for `users`: `id` (serial PK), `name`, `email` (unique), `password`, `role` (default `user`), `created_at`, `updated_at` (app-level auto-update via `$onUpdateFn`).

### 5.6 Validation

- `auth.validation.js` — `signupSchema` (name 2–255, valid email, password 6–125, role constrained to `user`) and `signinSchema` (email + password).

### 5.7 Utils

- `cookies.js` — Centralized cookie options (`httpOnly`, `secure` in prod, `sameSite: strict`, `maxAge` 15h).
- `jwt.js` — `sign` (1d expiry) and `verify`.
- `format.js` — Flattens Zod `issues` into a string.

## 6. Authentication Flow

**Sign up** (`POST /api/auth/sign-up`)
1. Zod-validate body.
2. `createUser` checks for an existing email, hashes the password (bcrypt, 10 rounds), inserts, returns the new user (sans password).
3. `jwttoken.sign` issues a JWT with `{ id, email, role }`.
4. Token is stored in an HTTP-only cookie.
5. Responds `201` with a sanitized user object.

**Sign in** (`POST /api/auth/sign-in`)
1. Zod-validate body.
2. `authenticateUser` looks up the user, compares password hashes.
3. Issues JWT + sets cookie, returns `200`.

**Sign out** (`POST /api/auth/sign-out`)
1. Clears the `token` cookie, returns `200`.

## 7. Security Model

- **Transport / headers**: Helmet.
- **Bot & abuse**: Arcjet `detectBot` + `shield` + role-aware `slidingWindow` rate limiting.
- **Authentication**: bcrypt password hashing + signed JWT in an HTTP-only, `SameSite=strict` cookie (`Secure` in production).
- **Validation**: Zod schemas on all auth inputs.
- **CORS**: `cors()` — currently open (no origin restrictions).

## 8. Database

- Drizzle schema defined in `src/models/*.js`; `drizzle.config.js` points at `DATABASE_URL` and outputs migrations to `drizzle/`.
- Migration `0000_rich_sentinel.sql` creates the `users` table with a unique email index.
- Development can run against Neon Local (ephemeral branch); production targets Neon Cloud.

## 9. Logging

- Winston writes JSON logs to `logs/error.log` and `logs/combined.log`; console transport enabled outside production.
- Morgan streams HTTP access logs into Winston.

## 10. Deployment

### Development (Neon Local)
```
docker compose --env-file .env.development -f docker-compose.dev.yml up --build
```
- Runs `neon-local` (Neon Local proxy, port 5432) + the app (host 5173 → container 3000) with hot reload.

### Production (Neon Cloud)
```
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```
- Runs only the app (port 3000) against the external Neon Cloud `DATABASE_URL`, with memory/CPU limits and restart policy.

### Dockerfile
- `base` stage installs dependencies.
- `development` target: full `npm install`, `npm run dev`, hot reload.
- `production` target: `npm ci --omit=dev`, `npm start`.

## 11. Environment Variables

| Variable       | Purpose                                    | Required |
| -------------- | ------------------------------------------ | -------- |
| `PORT`         | HTTP port (default 3000)                   | No       |
| `NODE_ENV`     | `development` / `production`               | Yes      |
| `LOG_LEVEL`    | Winston log level                          | No       |
| `DATABASE_URL` | Neon Postgres connection string            | Yes      |
| `NEON_LOCAL`   | `true` to use the local proxy endpoint     | Dev only |
| `ARCJET_KEY`   | Arcjet API key                             | Yes      |
| `JWT_SECRET`   | Secret for signing JWTs                    | Yes      |

## 12. Known Issues & Recommendations

Resolved items (see git history for details):

1. `NEON_LOCAL=true` added to `.env.development`, and `DATABASE_URL` now points at the local proxy.
2. `scripts/dev.sh` restored to start containers first, wait for the DB, then migrate inside the container.
3. `jwt.js` now fails fast when `JWT_SECRET` is missing or still a placeholder.
4. `logs/` added to `.gitignore` and the log files untracked.
5. Centralized JSON error handler (and 404 handler) added to `app.js`.
6. Arcjet per-role clients are built once at module load in `security.middleware.js`.
7. `.env.example` completed, and `.env.development.example` / `.env.production.example` created.
8. `src/models/user.mode.js` renamed to `user.model.js`.

Remaining action items:

- **Rotate secrets** — real credentials (Neon DB password, Neon API key, Arcjet key) currently live in the local `.env` / `.env.development` files. They are gitignored, but rotate them if there is any chance they were shared or pushed.
- **`updated_at` auto-update** is application-level (`$onUpdateFn`), not a database trigger — acceptable for ORM-driven updates.
