import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, requireAdmin, badRequest, serverError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { lignes } = await req.json();
    if (!lignes?.length) return badRequest("Lignes de réception requises.");

    const commande = await prisma.commandeFournisseur.findFirst({
      where: { id, pharmacieId: user!.pharmacieId },
    });
    if (!commande) return notFound("Commande introuvable.");
    if (!["envoyee", "recue_partielle"].includes(commande.statut)) {
      return badRequest("Seules les commandes envoyées peuvent être réceptionnées.");
    }

    // Créer les lots et mettre à jour les stocks
    for (const l of lignes as {
      ligne_commande_id: string;
      quantite_recue: number;
      numero_lot: string;
      date_expiration: string;
    }[]) {
      const ligne = await prisma.ligneCommande.findUnique({ where: { id: l.ligne_commande_id } });
      if (!ligne) continue;

      await prisma.lot.create({
        data: {
          medicamentId: ligne.medicamentId,
          numeroLot: l.numero_lot,
          dateExpiration: new Date(l.date_expiration),
          quantite: l.quantite_recue,
          quantiteInitiale: l.quantite_recue,
          statut: "disponible",
        },
      });

      await prisma.medicament.update({
        where: { id: ligne.medicamentId },
        data: { stockActuel: { increment: l.quantite_recue } },
      });

      await prisma.ligneCommande.update({
        where: { id: l.ligne_commande_id },
        data: { quantiteRecue: { increment: l.quantite_recue } },
      });
    }

    // Vérifier si tout a été reçu
    const lignesCommande = await prisma.ligneCommande.findMany({ where: { commandeId: id } });
    const toutRecu = lignesCommande.every((l) => l.quantiteRecue >= l.quantiteCommandee);

    const updated = await prisma.commandeFournisseur.update({
      where: { id },
      data: { statut: toutRecu ? "recue_complete" : "recue_partielle" },
    });

    return ok({ commande: updated, message: toutRecu ? "Commande reçue complètement." : "Réception partielle enregistrée." });
  } catch {
    return serverError();
  }
}
