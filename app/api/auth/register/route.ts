import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { badRequest, serverError } from "@/lib/api-helpers";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { nom, prenom, email, mot_de_passe, role = "admin", nom_pharmacie } =
      await req.json();

    if (!nom || !prenom || !email || !mot_de_passe || !nom_pharmacie) {
      return badRequest("Tous les champs obligatoires doivent être remplis.");
    }

    const err = validatePasswordStrength(mot_de_passe);
    if (err) return badRequest(err);

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) return badRequest("Cet email est déjà utilisé.");

    const hash = await hashPassword(mot_de_passe);

    const pharmacie = await prisma.pharmacie.create({
      data: { nom: nom_pharmacie },
    });

    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        motDePasseHash: hash,
        role: role === "caissier" ? "caissier" : "admin",
        pharmacieId: pharmacie.id,
      },
    });

    const payload = {
      userId: utilisateur.id,
      role: utilisateur.role,
      pharmacieId: pharmacie.id,
    };
    const [access_token, refresh_token] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken({ userId: utilisateur.id }),
    ]);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.sessionToken.create({
      data: { utilisateurId: utilisateur.id, token: refresh_token, expiresAt },
    });

    const res = NextResponse.json(
      { access_token, refresh_token, utilisateurId: utilisateur.id },
      { status: 201 }
    );
    res.cookies.set("access_token", access_token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400,
    });
    res.cookies.set("refresh_token", refresh_token, {
      httpOnly: true, sameSite: "lax", path: "/api/auth/refresh", maxAge: 604800,
    });
    return res;
  } catch {
    return serverError();
  }
}
