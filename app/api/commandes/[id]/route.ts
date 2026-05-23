import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, badRequest, requireAdmin, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const commande = await prisma.commandeFournisseur.findFirst({
      where: { id, pharmacieId: user.pharmacieId },
      include: {
        fournisseur: true,
        utilisateur: { select: { nom: true, prenom: true } },
        lignesCommande: { include: { medicament: true } },
      },
    });
    if (!commande) return notFound("Commande introuvable.");
    return ok(commande);
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
    const existing = await prisma.commandeFournisseur.findFirst({
      where: { id, pharmacieId: user!.pharmacieId },
    });
    if (!existing) return notFound("Commande introuvable.");
    if (existing.statut !== "brouillon") {
      return badRequest("Seules les commandes en brouillon sont modifiables.");
    }

    const body = await req.json();
    const { fournisseurId, lignes, dateLivraisonPrevue, notes } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (lignes && Array.isArray(lignes)) {
        await tx.ligneCommande.deleteMany({ where: { commandeId: id } });
        await tx.ligneCommande.createMany({
          data: lignes.map((l: { medicament_id: string; quantite_commandee: number; prix_unitaire: number }) => ({
            commandeId: id,
            medicamentId: l.medicament_id,
            quantiteCommandee: l.quantite_commandee,
            prixUnitaire: l.prix_unitaire,
          })),
        });
      }

      const montantTotal = lignes
        ? (lignes as { quantite_commandee: number; prix_unitaire: number }[]).reduce(
            (s, l) => s + l.quantite_commandee * Number(l.prix_unitaire),
            0
          )
        : Number(existing.montantTotal);

      return tx.commandeFournisseur.update({
        where: { id },
        data: {
          ...(fournisseurId ? { fournisseurId } : {}),
          ...(dateLivraisonPrevue ? { dateLivraisonPrevue: new Date(dateLivraisonPrevue) } : {}),
          ...(notes !== undefined ? { notes } : {}),
          montantTotal,
        },
        include: {
          fournisseur: true,
          lignesCommande: { include: { medicament: true } },
        },
      });
    });

    return ok(updated);
  } catch {
    return serverError();
  }
}
