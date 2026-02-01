import { decodeJwt } from 'jose';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export interface UserPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'DONOR';
  exp: number;
  iat: number;
}

export function parseJwt(token: string): UserPayload | null {
  try {
    const claims = decodeJwt(token);
    return claims as unknown as UserPayload;
  } catch (error) {
    console.error('Failed to parse JWT', error);
    return null;
  }
}
