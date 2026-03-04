# Workflow Engine

A robust Node.js TypeScript backend built with Express, featuring Docker support, PostgreSQL integration, and Prisma ORM.

## Features

- ✅ **TypeScript** - Full type safety
- ✅ **Express.js** - Fast web framework
- ✅ **Prisma ORM** - Type-safe database access
- ✅ **PostgreSQL** - Relational database via docker-compose
- ✅ **Docker** - Containerized with multi-stage builds
- ✅ **Environment Configuration** - Dotenv support with validation
- ✅ **ESLint & Prettier** - Code quality and formatting
- ✅ **Health Checks** - Built-in `/health` endpoint

## Project Structure

```
src/
├── config/           # Configuration loader & env vars
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── routes/          # Route definitions
├── services/        # Business logic & database operations
├── utils/           # Utility functions (Prisma client)
├── generated/       # Auto-generated Prisma types
├── index.ts         # App setup
└── server.ts        # Server entry point
prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations
```

## Database Schema

### Models

**User**
- `id` - Unique identifier
- `email` - Unique email
- `name` - User name
- `password` - Hashed password
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Workflow**
- `id` - Unique identifier
- `name` - Workflow name
- `description` - Optional description
- `status` - ACTIVE, PAUSED, ARCHIVED, DELETED
- `createdBy` - User ID who created it
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- Relations: `steps[]`, `executionLogs[]`

**WorkflowStep**
- `id` - Unique identifier
- `workflowId` - Parent workflow
- `name` - Step name
- `description` - Optional description
- `type` - HTTP, EMAIL, DATABASE, SCRIPT, WEBHOOK, etc.
- `order` - Execution order (unique per workflow)
- `config` - JSONB configuration
- `status` - ACTIVE, DISABLED, ARCHIVED
- `createdAt`, `updatedAt` - Timestamps
- Relations: `workflow`, `executionLogs[]`

**ExecutionLog**
- `id` - Unique identifier
- `workflowId` - Workflow being executed
- `workflowStepId` - Optional: specific step
- `status` - PENDING, RUNNING, COMPLETED, FAILED, SKIPPED, TIMEOUT, CANCELLED
- `startedAt` - Execution start time
- `completedAt` - Execution end time
- `duration` - Execution duration in milliseconds
- `input` - JSONB input data
- `output` - JSONB output data
- `error` - Error message if failed
- Relations: `workflow`, `workflowStep`

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (for containerized setup)

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   ```

3. **Start backend database**
   - Option A: Use Docker container
     ```bash
     docker compose up -d postgres
     ```
   - Option B: Use local PostgreSQL (ensure it's running on localhost:5432)

4. **Run Prisma migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:3000`

6. **Health check**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Setup

#### Build and Run with Docker Compose

```bash
docker compose up -d
```

This starts:
- **App** - http://localhost:3000
- **PostgreSQL** - localhost:5432

#### Run Migrations in Docker

```bash
# After containers are running
docker compose exec app npm run db:migrate
```

#### Environment Variables for Docker

Configure in `.env`:

```env
NODE_ENV=development
PORT=3000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workflow_db
DATABASE_URL=postgres://postgres:postgres@postgres:5432/workflow_db
LOG_LEVEL=debug
```

#### Useful Docker Commands

```bash
# Start containers
docker compose up -d

# View logs
docker compose logs -f app

# Run migrations
docker compose exec app npm run db:migrate

# Open database studio
docker compose exec app npm run db:studio

# Access database CLI
docker compose exec postgres psql -U postgres -d workflow_db

# Stop containers
docker compose down

# Remove everything (including volumes)
docker compose down -v

# Rebuild image
docker compose up -d --build
```

## Available Scripts

```bash
# Development
npm run dev           # Start dev server with hot reload

# Building
npm run build         # Compile TypeScript to JavaScript

# Production
npm start             # Run compiled app

# Database
npm run db:migrate    # Run pending migrations
npm run db:push       # Push schema without creating migration files
npm run db:studio     # Open Prisma Studio (visual DB management)

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format with Prettier

# Testing
npm test              # Run tests (placeholder)
```

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-04T08:00:00.000Z",
  "uptime": 123.456
}
```

## Database Operations

### Using Database Services

```typescript
import {
  UserService,
  WorkflowService,
  WorkflowStepService,
  ExecutionLogService,
} from '@/services/databaseService';

// Create a user
const user = await UserService.createUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'hashed_password',
});

// Create a workflow
const workflow = await WorkflowService.createWorkflow({
  name: 'My Workflow',
  createdBy: user.id,
});

// Add a step
const step = await WorkflowStepService.createStep({
  workflowId: workflow.id,
  name: 'Send Email',
  type: 'EMAIL',
  order: 1,
});

// Log execution
const log = await ExecutionLogService.createExecutionLog({
  workflowId: workflow.id,
  workflowStepId: step.id,
  status: 'RUNNING',
  startedAt: new Date(),
});
```

### Raw Prisma Access

```typescript
import { prisma } from '@/utils/prisma';

// Direct access to all models
const users = await prisma.user.findMany();
const workflows = await prisma.workflow.findUnique({
  where: { id: 'workflow-id' },
  include: { steps: true, executionLogs: true },
});
```

## Configuration

Environment configuration is loaded from `.env` file via `dotenv` and managed in [src/config/index.ts](src/config/index.ts).

**Required variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DATABASE_URL` - PostgreSQL connection string

**Database variables:**
- `POSTGRES_HOST` - Database host
- `POSTGRES_PORT` - Database port
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name

## Development Workflow

1. **Code Style** - All code must pass ESLint
   ```bash
   npm run lint:fix
   ```

2. **Formatting** - Format code with Prettier
   ```bash
   npm run format
   ```

3. **Build** - Test compilation before committing
   ```bash
   npm run build
   ```

4. **Database** - Create migrations for schema changes
   ```bash
   # After modifying prisma/schema.prisma
   npm run db:migrate
   ```

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# Verify DATABASE_URL in .env matches your setup
```

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
npm run db:migrate
```

### Port Already in Use
Change PORT in `.env` or:
```bash
lsof -i :3000
kill -9 <PID>
```

### Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## License

ISC
