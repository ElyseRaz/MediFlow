import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, requireAdmin, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const u = await prisma.utilisateur.findFirst({
      where: { id, pharmacieId: user!.pharmacieId },
      select: {
        id: true, nom: true, prenom: true, email: true,
        role: true, actif: true, dernierConnexion: true,
      },
    });
    if (!u) return notFound("Utilisateur introuvable.");

    const [nb_ventes, ca_genere] = await Promise.all([
      prisma.vente.count({ where: { utilisateurId: id } }),
      prisma.vente.aggregate({
        where: { utilisateurId: id, statut: "complete" },
        _sum: { montantTotal: true },
      }),
    ]);

    return ok({ ...u, nb_ventes, ca_genere: Number(ca_genere._sum.montantTotal ?? 0) });
  } catch {
    return serverError();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await prisma.utilisateur.findFirst({
      where: { id, pharmacieId: user!.pharmacieId },
    });
    if (!existing) return notFound("Utilisateur introuvable.");

    const updated = await prisma.utilisateur.update({
      where: { id },
      data: {
        nom: body.nom ?? existing.nom,
        prenom: body.prenom ?? existing.prenom,
        email: body.email ?? existing.email,
        role: body.role ?? existing.role,
      },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
