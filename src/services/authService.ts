import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  private saltRounds = 10;

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  }
}

export const authService = new AuthService();
