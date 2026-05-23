"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ModePaiement } from "@prisma/client";

export type LigneVenteInput = {
  medicamentId: string;
  quantite: number;
  prixUnitaire: number;
  tauxRemise?: number;
};

export type VenteInput = {
  pharmacieId: string;
  utilisateurId: string;
  modePaiement: ModePaiement;
  montantPaye: number;
  notes?: string;
  lignes: LigneVenteInput[];
};

type LigneDB = {
  medicamentId: string;
  lotId: string | null;
  quantite: number;
  prixUnitaire: number;
  tauxRemise: number;
  montantRemise: number;
  sousTotal: number;
};

export async function createVente(data: VenteInput) {
  const montantTotal = data.lignes.reduce((sum, l) => {
    const remise = (l.prixUnitaire * l.quantite * (l.tauxRemise ?? 0)) / 100;
    return sum + l.prixUnitaire * l.quantite - remise;
  }, 0);

  const count = await prisma.vente.count();
  const numeroVente = `VNT-${String(count + 1).padStart(6, "0")}`;

  // Construire les lignes en consommant les lots FIFO
  const lignesDB: LigneDB[] = [];
  const lotsAMettreAJour: { id: string; nouvelleQte: number }[] = [];

  for (const ligne of data.lignes) {
    const prixU = ligne.prixUnitaire;
    const taux = ligne.tauxRemise ?? 0;
    let qteRestante = ligne.quantite;

    const lots = await prisma.lot.findMany({
      where: {
        medicamentId: ligne.medicamentId,
        statut: "disponible",
        quantite: { gt: 0 },
      },
      orderBy: [
        { dateExpiration: "asc" },
        { createdAt: "asc" },
      ],
    });

    for (const lot of lots) {
      if (qteRestante <= 0) break;
      const qtePrelevee = Math.min(lot.quantite, qteRestante);
      const montantRemise = (prixU * qtePrelevee * taux) / 100;
      lignesDB.push({
        medicamentId: ligne.medicamentId,
        lotId: lot.id,
        quantite: qtePrelevee,
        prixUnitaire: prixU,
        tauxRemise: taux,
        montantRemise,
        sousTotal: prixU * qtePrelevee - montantRemise,
      });
      lotsAMettreAJour.push({ id: lot.id, nouvelleQte: lot.quantite - qtePrelevee });
      qteRestante -= qtePrelevee;
    }

    // Quantité non couverte par des lots (stock sans lot)
    if (qteRestante > 0) {
      const montantRemise = (prixU * qteRestante * taux) / 100;
      lignesDB.push({
        medicamentId: ligne.medicamentId,
        lotId: null,
        quantite: qteRestante,
        prixUnitaire: prixU,
        tauxRemise: taux,
        montantRemise,
        sousTotal: prixU * qteRestante - montantRemise,
      });
    }
  }

  const vente = await prisma.vente.create({
    data: {
      pharmacieId: data.pharmacieId,
      utilisateurId: data.utilisateurId,
      numeroVente,
      modePaiement: data.modePaiement,
      montantTotal,
      montantPaye: data.montantPaye,
      monnaie: Math.max(0, data.montantPaye - montantTotal),
      lignesVente: { create: lignesDB },
    },
  });

  // Mettre à jour les lots consommés
  for (const { id, nouvelleQte } of lotsAMettreAJour) {
    await prisma.lot.update({
      where: { id },
      data: {
        quantite: nouvelleQte,
        statut: nouvelleQte <= 0 ? "epuise" : "disponible",
      },
    });
  }

  // Décrémenter le stock médicament (basé sur les quantités d'origine)
  for (const ligne of data.lignes) {
    await prisma.medicament.update({
      where: { id: ligne.medicamentId },
      data: { stockActuel: { decrement: ligne.quantite } },
    });
  }

  revalidatePath("/ventes");
  revalidatePath("/stock");
  revalidatePath("/dashboard");

  return { numeroVente: vente.numeroVente, montantTotal, monnaie: Math.max(0, data.montantPaye - montantTotal) };
}
