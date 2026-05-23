import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, unauthorized, notFound,
  requireAdmin, badRequest, serverError,
} from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { statut, motif } = await req.json();
    if (!["annulee", "remboursee"].includes(statut)) {
      return badRequest("Statut invalide. Valeurs acceptées : annulee, remboursee");
    }

    const vente = await prisma.vente.findFirst({
      where: { id, pharmacieId: user!.pharmacieId, statut: "complete" },
      include: { lignesVente: true },
    });
    if (!vente) return notFound("Vente introuvable ou déjà annulée.");

    // Réincrémenter le stock si annulation
    if (statut === "annulee") {
      for (const ligne of vente.lignesVente) {
        await prisma.medicament.update({
          where: { id: ligne.medicamentId },
          data: { stockActuel: { increment: ligne.quantite } },
        });
        if (ligne.lotId) {
          await prisma.lot.update({
            where: { id: ligne.lotId },
            data: { quantite: { increment: ligne.quantite }, statut: "disponible" },
          });
        }
      }
    }

    const updated = await prisma.vente.update({
      where: { id },
      data: { statut: statut as "annulee" | "remboursee", notes: motif ?? vente.notes },
    });

    return ok(updated);
  } catch {
    return serverError();
  }
}
