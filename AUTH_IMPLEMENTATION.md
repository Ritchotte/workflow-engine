# JWT Authentication Implementation

## Overview
JWT (JSON Web Token) authentication has been implemented with the following features:
- User registration with password hashing (bcrypt)
- User login with JWT token generation
- Protected routes middleware for verifying JWT tokens
- Password security using bcrypt with salt rounds of 10

## API Endpoints

### Register a New User
**POST** `/auth/register`

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

Response (201 Created):
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2026-03-04T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
**POST** `/auth/login`

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

Response (200 OK):
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Using Protected Routes

To access protected routes, include the JWT token in the Authorization header:

```bash
curl -X GET http://localhost:3000/protected-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Protecting Routes with Middleware

To protect a route, import and use the `authenticate` middleware:

```typescript
import { router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { someController } from '../controllers/someController';

const router = Router();

// Protected route
router.get('/protected', authenticate, someController.getProtectedData);

export default router;
```

The authenticated user information will be available in `req.user`:

```typescript
export const getProtectedData = (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const email = req.user?.email;
  // ... use user info
};
```

## Environment Variables

Add these variables to your `.env` file:

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

- `JWT_SECRET`: Secret key used to sign and verify JWT tokens (change this in production!)
- `JWT_EXPIRES_IN`: Token expiration time (e.g., "24h", "7d", "1w")

## Dependency Installation

The following packages have been installed:
- `bcrypt`: For password hashing
- `jsonwebtoken`: For JWT token generation and verification
- `@types/bcrypt`: TypeScript types for bcrypt
- `@types/jsonwebtoken`: TypeScript types for jsonwebtoken

## Files Created/Modified

### New Files
- `src/services/authService.ts` - Authentication service (hashing, token generation)
- `src/controllers/authController.ts` - Controllers for register and login endpoints
- `src/routes/auth.ts` - Authentication routes
- `src/middleware/authenticate.ts` - JWT middleware for protected routes

### Modified Files
- `src/config/index.ts` - Added JWT configuration
- `src/index.ts` - Integrated auth routes
- `.env` and `.env.example` - Added JWT configuration variables
