import { cookies } from "next/headers";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

export async function getServerUser(): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
