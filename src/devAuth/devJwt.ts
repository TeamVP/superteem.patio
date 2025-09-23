import { SignJWT } from 'jose';
import { TextEncoder as NodeTextEncoder } from 'util';

export interface DevJwtClaims {
  sub: string;
  name?: string;
  email?: string;
  iss?: string;
  [key: string]: unknown;
}

const ISSUER = 'dev://local';

export async function getDevJwt(subject: string, name?: string, email?: string): Promise<string> {
  const secret = import.meta.env.VITE_DEV_JWT_SECRET as string | undefined;
  if (!secret) throw new Error('VITE_DEV_JWT_SECRET not set');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Enc = (globalThis as any).TextEncoder || NodeTextEncoder;
  const enc = new Enc();
  const key = enc.encode(secret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60; // 15 minutes
  const jwt = await new SignJWT({ name, email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
  return jwt;
}

export { ISSUER };
