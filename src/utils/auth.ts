import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param password - The plain text password.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain text password against a bcrypt hash.
 *
 * @param password - The plain text password to check.
 * @param hash - The stored bcrypt hash.
 * @returns A promise that resolves to a boolean indicating match.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JWT token containing user session details.
 *
 * @param payload - User info to embed in the token.
 * @returns The signed JWT string.
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT token and returns its decoded payload.
 *
 * @param token - The JWT string to verify.
 * @returns The decoded TokenPayload if valid, or null.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
