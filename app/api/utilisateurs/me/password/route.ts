import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, badRequest, serverError } from "@/lib/api-helpers";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = await req.json();
    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return badRequest("Les deux mots de passe sont requis.");
    }

    const errForce = validatePasswordStrength(nouveau_mot_de_passe);
    if (errForce) return badRequest(errForce);

    const u = await prisma.utilisateur.findUnique({ where: { id: user.userId } });
    if (!u) return unauthorized();

    const valid = await verifyPassword(ancien_mot_de_passe, u.motDePasseHash);
    if (!valid) return NextResponse.json({ error: "Ancien mot de passe incorrect." }, { status: 403 });

    const hash = await hashPassword(nouveau_mot_de_passe);
    await prisma.utilisateur.update({ where: { id: user.userId }, data: { motDePasseHash: hash } });

    return ok({ message: "Mot de passe mis à jour." });
  } catch {
    return serverError();
  }
}
