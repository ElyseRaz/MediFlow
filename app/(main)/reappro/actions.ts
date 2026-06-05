"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { StatutCommande } from "@prisma/client";

export type LigneCommandeInput = {
  medicamentId: string;
  quantiteCommandee: number;
  prixUnitaire: number;
};

export type CommandeInput = {
  pharmacieId: string;
  fournisseurId: string;
  utilisateurId: string;
  dateLivraisonPrevue?: string;
  notes?: string;
  lignes: LigneCommandeInput[];
};

export async function createCommande(data: CommandeInput) {
  const montantTotal = data.lignes.reduce(
    (s, l) => s + l.quantiteCommandee * l.prixUnitaire,
    0
  );
  const count = await prisma.commandeFournisseur.count();
  const numeroCommande = `CMD-${String(count + 1).padStart(6, "0")}`;

  await prisma.commandeFournisseur.create({
    data: {
      pharmacieId: data.pharmacieId,
      fournisseurId: data.fournisseurId,
      utilisateurId: data.utilisateurId,
      numeroCommande,
      statut: "envoyee",
      dateLivraisonPrevue: data.dateLivraisonPrevue ? new Date(data.dateLivraisonPrevue) : null,
      notes: data.notes || null,
      montantTotal,
      lignesCommande: {
        create: data.lignes.map((l) => ({
          medicamentId: l.medicamentId,
          quantiteCommandee: l.quantiteCommandee,
          quantiteRecue: 0,
          prixUnitaire: l.prixUnitaire,
          sousTotal: l.quantiteCommandee * l.prixUnitaire,
        })),
      },
    },
  });

  revalidatePath("/reappro");
}

export async function updateCommandeStatut(id: string, statut: StatutCommande) {
  await prisma.commandeFournisseur.update({ where: { id }, data: { statut } });
  revalidatePath("/reappro");
}

export async function recevoirCommande(commandeId: string) {
  const commande = await prisma.commandeFournisseur.findUnique({
    where: { id: commandeId },
    include: { lignesCommande: true },
  });
  if (!commande) return;

  for (const ligne of commande.lignesCommande) {
    await prisma.medicament.update({
      where: { id: ligne.medicamentId },
      data: { stockActuel: { increment: ligne.quantiteCommandee } },
    });
    await prisma.ligneCommande.update({
      where: { id: ligne.id },
      data: { quantiteRecue: ligne.quantiteCommandee },
    });
  }

  await prisma.commandeFournisseur.update({
    where: { id: commandeId },
    data: { statut: "recue_complete" },
  });

  revalidatePath("/reappro");
  revalidatePath("/stock");
}
