"use server";

import { getServerUser } from "@/lib/server-auth";
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

const MODES_VALIDES: ModePaiement[] = ["especes", "carte_bancaire", "mobile_money", "virement"];

function validateVente(data: VenteInput) {
  if (!data.lignes || data.lignes.length === 0)
    throw new Error("Le panier est vide.");
  if (!MODES_VALIDES.includes(data.modePaiement))
    throw new Error("Mode de paiement invalide.");
  if (typeof data.montantPaye !== "number" || data.montantPaye < 0)
    throw new Error("Montant reçu invalide.");

  for (const l of data.lignes) {
    if (!l.medicamentId?.trim()) throw new Error("Identifiant médicament manquant.");
    if (!Number.isInteger(l.quantite) || l.quantite <= 0)
      throw new Error("La quantité doit être un entier positif.");
    if (typeof l.prixUnitaire !== "number" || l.prixUnitaire < 0)
      throw new Error("Prix unitaire invalide.");
    const taux = l.tauxRemise ?? 0;
    if (taux < 0 || taux > 100)
      throw new Error("Le taux de remise doit être entre 0 et 100.");
  }
}

export async function createVente(data: VenteInput) {
  // pharmacieId et utilisateurId viennent de la session — jamais du client
  const user = await getServerUser();
  if (!user) throw new Error("Non authentifié");

  validateVente(data);

  const montantTotal = data.lignes.reduce((sum, l) => {
    const remise = (l.prixUnitaire * l.quantite * (l.tauxRemise ?? 0)) / 100;
    return sum + l.prixUnitaire * l.quantite - remise;
  }, 0);

  if (data.montantPaye < montantTotal)
    throw new Error("Montant reçu insuffisant.");

  const count = await prisma.vente.count();
  const numeroVente = `VNT-${String(count + 1).padStart(6, "0")}`;

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
      pharmacieId: user.pharmacieId,
      utilisateurId: user.userId,
      numeroVente,
      modePaiement: data.modePaiement,
      montantTotal,
      montantPaye: data.montantPaye,
      monnaie: Math.max(0, data.montantPaye - montantTotal),
      lignesVente: { create: lignesDB },
    },
  });

  for (const { id, nouvelleQte } of lotsAMettreAJour) {
    await prisma.lot.update({
      where: { id },
      data: {
        quantite: nouvelleQte,
        statut: nouvelleQte <= 0 ? "epuise" : "disponible",
      },
    });
  }

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
