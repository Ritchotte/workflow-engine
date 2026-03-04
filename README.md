# Workflow Engine

A robust Node.js TypeScript backend built with Express, featuring Docker support and PostgreSQL integration.

## Features

- ✅ **TypeScript** - Full type safety
- ✅ **Express.js** - Fast web framework
- ✅ **Docker** - Containerized with multi-stage builds
- ✅ **PostgreSQL** - Database integration via docker-compose
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
├── services/        # Business logic
├── utils/           # Utility functions
├── index.ts         # App setup
└── server.ts        # Server entry point
```

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

3. **Start development server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:3000`

4. **Health check**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Setup

#### Build and Run with Docker Compose

```bash
docker-compose up -d
```

This starts:
- **App** - http://localhost:3000
- **PostgreSQL** - localhost:5432

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
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild image
docker-compose up -d --build

# Access database
docker-compose exec postgres psql -U postgres -d workflow_db
```

## Available Scripts

```bash
# Development
npm run dev           # Start dev server with hot reload

# Building
npm run build         # Compile TypeScript to JavaScript

# Production
npm start             # Run compiled app

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

## Configuration

Environment configuration is loaded from `.env` file via `dotenv` and managed in [src/config/index.ts](src/config/index.ts).

**Required variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port

**Database variables:**
- `POSTGRES_HOST` - Database host
- `POSTGRES_PORT` - Database port
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name
- `DATABASE_URL` - Full connection string

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

## Troubleshooting

### Docker Build Fails
```bash
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Error
- Ensure PostgreSQL container is running: `docker-compose ps`
- Check DATABASE_URL in `.env`
- Verify database credentials match docker-compose.yml

### Port Already in Use
Change PORT in `.env` or:
```bash
lsof -i :3000
kill -9 <PID>
```

## License

ISC
