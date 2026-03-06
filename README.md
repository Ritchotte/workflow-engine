# Workflow Engine

This is a backend project for building and running simple workflows.

Think of it like this:
- A **workflow** is a sequence of steps.
- Each **step** is an action.
- Right now, supported step actions are:
  - `http_request`
  - `delay`
  - `log`

Built with:
- Node.js + TypeScript
- Express
- Prisma
- PostgreSQL

## Why this project exists

This project is a clean starter for workflow automation ideas.
If you're in school (or just prototyping), it gives you:
- auth basics
- CRUD APIs for workflows
- ordered steps with JSON config
- execution logging for each step

## Author

Ruth Anna Ritchotte

## Project layout

```txt
src/
  config/         env + config loading
  controllers/    request handlers
  middleware/     express middleware
  routes/         API route files
  services/       business logic + executors
  utils/          helpers (like Prisma client)
  index.ts        express app setup
  server.ts       app entrypoint

prisma/
  schema.prisma   database models
  migrations/     prisma migrations
```

## Quick start (local)

### 1. Install deps

```bash
npm install --legacy-peer-deps
```

### 2. Create env file

```bash
cp .env.example .env
```

### 3. Start Postgres

If you want to use Docker:

```bash
docker compose up -d postgres
```

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Start server

```bash
npm run dev
```

Server should run on:
- `http://localhost:3000`

Health check:

```bash
curl http://localhost:3000/health
```

## Docker all-in-one

Run app + database:

```bash
docker compose up -d
```

Then run migrations inside container:

```bash
docker compose exec app npm run db:migrate
```

## Main API routes

### Health
- `GET /health`

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Workflows
- `POST /workflows`
- `GET /workflows`
- `GET /workflows/:id`
- `DELETE /workflows/:id`
- `POST /workflows/:id/execute`

## Workflow + step model (plain English)

### Workflow
A workflow has:
- name
- optional description
- status
- creator (`createdBy`)
- ordered steps

### Step
Each step has:
- `name`
- `type` (`http_request`, `delay`, `log`)
- `order`
- `config` (JSON)

`config` is where step-specific options live.

## Step config examples

### `http_request`

```json
{
  "name": "Call API",
  "type": "http_request",
  "order": 1,
  "config": {
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "hello": "world"
    },
    "timeoutMs": 10000
  }
}
```

### `delay`

```json
{
  "name": "Wait 2 seconds",
  "type": "delay",
  "order": 2,
  "config": {
    "durationMs": 2000
  }
}
```

### `log`

```json
{
  "name": "Print message",
  "type": "log",
  "order": 3,
  "config": {
    "message": "Workflow reached step 3",
    "level": "info"
  }
}
```

## Create a workflow (example)

```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Workflow",
    "description": "Simple 3-step run",
    "createdBy": "<USER_ID>",
    "steps": [
      {
        "name": "Call API",
        "type": "http_request",
        "order": 1,
        "config": {
          "url": "https://httpbin.org/get",
          "method": "GET"
        }
      },
      {
        "name": "Pause",
        "type": "delay",
        "order": 2,
        "config": {
          "durationMs": 1000
        }
      },
      {
        "name": "Log done",
        "type": "log",
        "order": 3,
        "config": {
          "message": "Done",
          "level": "info"
        }
      }
    ]
  }'
```

## Execute a workflow

```bash
curl -X POST http://localhost:3000/workflows/<WORKFLOW_ID>/execute
```

The server executes active steps in order and stores execution logs.

## Scripts you’ll actually use

```bash
npm run dev         # start dev server
npm run build       # TypeScript compile
npm run lint        # lint checks
npm run db:migrate  # run prisma migrations
npm run db:push     # push schema (without migration files)
npm run db:studio   # open Prisma Studio
```

## Environment variables

At minimum, set:
- `PORT`
- `DATABASE_URL`
- `NODE_ENV`

If you use docker-compose defaults, your `.env` can look like this:

```env
NODE_ENV=development
PORT=3000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workflow_db
DATABASE_URL=postgres://postgres:postgres@postgres:5432/workflow_db
```

## Common issues

### Postgres not connecting

```bash
docker compose ps
docker compose logs postgres
```

Then verify your `DATABASE_URL`.

### Prisma type/client mismatch

```bash
npx prisma generate
npm run build
```

### Port 3000 busy

```bash
lsof -i :3000
kill -9 <PID>
```

## License

ISC
