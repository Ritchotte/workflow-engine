export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = statusCode >= 400 && statusCode < 500;
  }
}
