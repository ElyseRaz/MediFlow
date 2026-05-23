import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { badRequest, serverError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, mot_de_passe } = await req.json();
    if (!email || !mot_de_passe) {
      return badRequest("Email et mot de passe requis.");
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      include: { pharmacie: true },
    });

    if (!utilisateur || !utilisateur.actif) {
      return NextResponse.json(
        { error: "Identifiants incorrects ou compte désactivé." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(mot_de_passe, utilisateur.motDePasseHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    const payload = {
      userId: utilisateur.id,
      role: utilisateur.role,
      pharmacieId: utilisateur.pharmacieId,
    };

    const [access_token, refresh_token] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken({ userId: utilisateur.id }),
    ]);

    // Stocker le refresh token en base (révocable)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.sessionToken.create({
      data: { utilisateurId: utilisateur.id, token: refresh_token, expiresAt },
    });

    // Mettre à jour dernierConnexion
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { dernierConnexion: new Date() },
    });

    const res = NextResponse.json({
      access_token,
      refresh_token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
        pharmacie: utilisateur.pharmacie.nom,
      },
    });

    res.cookies.set("access_token", access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    res.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth/refresh",
      maxAge: 604800,
    });

    return res;
  } catch {
    return serverError();
  }
}
