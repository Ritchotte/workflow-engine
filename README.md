# Workflow Engine

A TypeScript backend for creating and executing multi-step workflows with manual, webhook, and scheduled triggers.

## Stack
- Node.js + TypeScript
- Express
- Prisma + PostgreSQL
- BullMQ + Redis
- Zod validation
- Pino logging
- Swagger/OpenAPI

## Architecture
The codebase follows a layered structure:

- `routes/`: endpoint definitions and middleware composition
- `controllers/`: HTTP orchestration (request -> service -> response)
- `services/`: business logic and data orchestration
- `middleware/`: cross-cutting concerns (security, validation, logging, errors)
- `errors/`: shared application error types
- `utils/`: reusable utilities (`asyncHandler`, logger, API response helpers)

### Request Lifecycle
1. Security middleware (`helmet`, rate limiter)
2. Request parsing + request logging
3. Zod validation (`validateRequest`)
4. Controller dispatch
5. Service layer execution
6. Typed API response
7. Centralized error middleware for failures

## Core Backend Improvements

### Centralized error handling
- `AppError` defines operational errors with status codes/details.
- `errorHandler` converts all thrown errors into consistent JSON responses.
- `asyncHandler` removes repeated `try/catch` boilerplate in controllers.

### Service layer separation
- Auth business logic is in `AuthManagementService`.
- Workflow business logic is in `WorkflowManagementService`.
- Controllers now focus on HTTP concerns only.

### Typed API responses
- Shared response contracts in `src/types/api.ts`.
- Shared helpers in `src/utils/apiResponse.ts`.
- Success/error payloads are consistent across endpoints.

## API Documentation
- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/openapi.json`

## API Surface

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
- `GET /workflows/:id/execution-logs`
- `POST /workflows/:id/execute`
- `POST /workflows/:id/trigger/manual`
- `POST /workflows/:id/trigger/webhook`

## Trigger Types
- `manual` (default)
- `webhook` (optional secret in `triggerConfig.secret`)
- `scheduled` (cron in `triggerConfig.cronExpression`)

## Quick Start

1. Install dependencies
```bash
npm install --legacy-peer-deps
```

2. Configure environment
```bash
cp .env.example .env
```

3. Start infrastructure
```bash
docker compose up -d postgres redis
```

4. Run migrations
```bash
npm run db:migrate
```

5. Start API
```bash
npm run dev
```

6. Start worker (separate terminal)
```bash
npm run worker
```

## Useful Scripts
```bash
npm run dev
npm run worker
npm run build
npm run test
npm run lint
npm run db:migrate
npm run db:push
npm run db:studio
```

## Example: Create Workflow
```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Workflow",
    "createdBy": "<USER_ID>",
    "triggerType": "manual",
    "steps": [
      {
        "name": "Log Start",
        "type": "log",
        "order": 1,
        "config": { "message": "started", "level": "info" }
      }
    ]
  }'
```

## Example: Manual Execution
```bash
curl -X POST http://localhost:3000/workflows/<WORKFLOW_ID>/trigger/manual
```

## Example: Webhook Execution
```bash
curl -X POST http://localhost:3000/workflows/<WORKFLOW_ID>/trigger/webhook \
  -H "x-webhook-secret: <optional_secret>" \
  -H "Content-Type: application/json" \
  -d '{"event":"demo"}'
```

## Notes
- Run both API and worker for queued workflow execution.
- `/docs` is generated from the OpenAPI spec in `src/docs/openapi.ts`.
