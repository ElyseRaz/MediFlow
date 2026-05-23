import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { badRequest, serverError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token =
      body.refresh_token ?? req.cookies.get("refresh_token")?.value;

    if (!token) return badRequest("Refresh token manquant.");

    const payload = await verifyRefreshToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide ou expiré." }, { status: 401 });
    }

    // Vérifier que le token existe en base (non révoqué)
    const session = await prisma.sessionToken.findFirst({
      where: { token, utilisateurId: payload.userId, expiresAt: { gt: new Date() } },
      include: { utilisateur: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session révoquée." }, { status: 401 });
    }

    const newToken = await signAccessToken({
      userId: session.utilisateur.id,
      role: session.utilisateur.role,
      pharmacieId: session.utilisateur.pharmacieId,
    });

    const res = NextResponse.json({ access_token: newToken });
    res.cookies.set("access_token", newToken, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400,
    });
    return res;
  } catch {
    return serverError();
  }
}
