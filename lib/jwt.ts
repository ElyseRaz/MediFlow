import { SignJWT, jwtVerify } from "jose";

export type AccessTokenPayload = {
  userId: string;
  role: string;
  pharmacieId: string;
};

export type RefreshTokenPayload = {
  userId: string;
};

const enc = (s: string) => new TextEncoder().encode(s);

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(enc(process.env.JWT_SECRET!));
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(enc(process.env.JWT_REFRESH_SECRET!));
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, enc(process.env.JWT_SECRET!));
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, enc(process.env.JWT_REFRESH_SECRET!));
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}
