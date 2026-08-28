# Aquisation

## Local development with Neon Local

Neon Local creates an ephemeral branch when the development stack starts and deletes it when the stack stops.

1. Copy `.env.development.example` to `.env.development`.
2. Set `NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID` in `.env.development`.
3. Start the stack:

```sh
docker compose --env-file .env.development -f docker-compose.dev.yml up --build
```

The application connects to `neon-local:5432` inside the Compose network. The host endpoints are `http://localhost:3000` and `localhost:5432`.

Stop the stack with `docker compose -f docker-compose.dev.yml down`. The ephemeral branch is removed by Neon Local when `DELETE_BRANCH=true`.

## Production with Neon Cloud

Neon Cloud is an external managed service, so production does not run a local database container. The production Compose file runs only the application and injects the cloud connection string from the environment.

1. Copy `.env.production.example` to `.env.production`.
2. Set `DATABASE_URL` to the real Neon Cloud URL and provide the other secrets.
3. Start the production app:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

The development and production switch is `DATABASE_URL`: development uses `postgres://neon:npg@neon-local:5432/neondb`, while production uses the injected `neon.tech` URL. `NEON_LOCAL=true` enables the local serverless-driver endpoint; production sets it to `false`.

Never commit `.env`, `.env.development`, or `.env.production`. Store production secrets in the deployment platform’s secret manager.