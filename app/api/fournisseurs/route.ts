import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, created, unauthorized, badRequest, requireAdmin, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const actif = url.searchParams.get("actif");
    const search = url.searchParams.get("search") ?? "";

    const where = {
      ...(actif !== null ? { actif: actif === "true" } : {}),
      ...(search ? { nom: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const fournisseurs = await prisma.fournisseur.findMany({
      where,
      orderBy: { nom: "asc" },
    });

    // Ajouter les stats (nb commandes, CA)
    const withStats = await Promise.all(
      fournisseurs.map(async (f) => {
        const [nb_commandes, ca] = await Promise.all([
          prisma.commandeFournisseur.count({
            where: { fournisseurId: f.id, pharmacieId: user.pharmacieId },
          }),
          prisma.commandeFournisseur.aggregate({
            where: { fournisseurId: f.id, pharmacieId: user.pharmacieId, statut: "recue_complete" },
            _sum: { montantTotal: true },
          }),
        ]);
        return { ...f, nb_commandes, ca_total: Number(ca._sum.montantTotal ?? 0) };
      })
    );

    return ok(withStats);
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const { nom, contact, email, telephone, adresse } = await req.json();
    if (!nom) return badRequest("Le nom du fournisseur est requis.");

    const f = await prisma.fournisseur.create({
      data: { nom, contact: contact || null, email: email || null, telephone: telephone || null, adresse: adresse || null },
    });
    return created(f);
  } catch {
    return serverError();
  }
}
