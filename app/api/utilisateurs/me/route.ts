import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const u = await prisma.utilisateur.findUnique({
      where: { id: user.userId },
      select: {
        id: true, nom: true, prenom: true, email: true,
        role: true, actif: true, dernierConnexion: true,
        pharmacie: { select: { id: true, nom: true } },
      },
    });
    if (!u) return unauthorized("Utilisateur introuvable.");
    return ok(u);
  } catch {
    return serverError();
  }
}
