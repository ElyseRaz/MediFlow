import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, created, unauthorized, badRequest, requireAdmin, serverError } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const actif = url.searchParams.get("actif");

    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        pharmacieId: user!.pharmacieId,
        ...(role ? { role: role as "admin" | "caissier" } : {}),
        ...(actif !== null ? { actif: actif === "true" } : {}),
      },
      select: {
        id: true, nom: true, prenom: true, email: true,
        role: true, actif: true, dernierConnexion: true, createdAt: true,
      },
      orderBy: { nom: "asc" },
    });
    return ok(utilisateurs);
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const { nom, prenom, email, role, mot_de_passe_temp } = await req.json();
    if (!nom || !prenom || !email || !role || !mot_de_passe_temp) {
      return badRequest("Tous les champs sont requis.");
    }

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) return badRequest("Cet email est déjà utilisé.");

    const hash = await hashPassword(mot_de_passe_temp);
    const u = await prisma.utilisateur.create({
      data: {
        nom, prenom, email,
        motDePasseHash: hash,
        role: role as "admin" | "caissier",
        pharmacieId: user!.pharmacieId,
      },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
    return created(u);
  } catch {
    return serverError();
  }
}
