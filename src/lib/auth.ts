import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'smart-expense-tracker-dev-secret-key-at-least-32-chars!'
);

export const COOKIE_NAME = process.env.COOKIE_NAME || 'finance_session';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  currency: string;
}

/**
 * Hashes plaintext password securely using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password against stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a signed JWT session token valid for 30 days.
 */
export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes a session token.
 */
export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      currency: (payload.currency as string) || 'INR',
    };
  } catch {
    return null;
  }
}
