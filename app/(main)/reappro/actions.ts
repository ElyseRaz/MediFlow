"use server";

import { getServerUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { StatutCommande } from "@prisma/client";

export type LigneCommandeInput = {
  medicamentId: string;
  quantiteCommandee: number;
  prixUnitaire: number;
};

export type CommandeInput = {
  fournisseurId: string;
  dateLivraisonPrevue?: string;
  notes?: string;
  lignes: LigneCommandeInput[];
};

const STATUTS_VALIDES: StatutCommande[] = [
  "brouillon", "envoyee", "recue_partielle", "recue_complete", "annulee",
];

async function requireAuth() {
  const user = await getServerUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

function validateCommande(data: CommandeInput) {
  if (!data.fournisseurId?.trim()) throw new Error("Le fournisseur est requis.");
  if (!data.lignes || data.lignes.length === 0) throw new Error("La commande est vide.");
  for (const l of data.lignes) {
    if (!l.medicamentId?.trim()) throw new Error("Identifiant médicament manquant.");
    if (!Number.isInteger(l.quantiteCommandee) || l.quantiteCommandee <= 0)
      throw new Error("La quantité commandée doit être un entier positif.");
    if (typeof l.prixUnitaire !== "number" || l.prixUnitaire < 0)
      throw new Error("Le prix unitaire ne peut pas être négatif.");
  }
}

export async function createCommande(data: CommandeInput) {
  // pharmacieId et utilisateurId viennent de la session — jamais du client
  const user = await requireAuth();
  validateCommande(data);

  const montantTotal = data.lignes.reduce(
    (s, l) => s + l.quantiteCommandee * l.prixUnitaire,
    0
  );
  const count = await prisma.commandeFournisseur.count();
  const numeroCommande = `CMD-${String(count + 1).padStart(6, "0")}`;

  await prisma.commandeFournisseur.create({
    data: {
      pharmacieId: user.pharmacieId,
      fournisseurId: data.fournisseurId,
      utilisateurId: user.userId,
      numeroCommande,
      statut: "envoyee",
      dateLivraisonPrevue: data.dateLivraisonPrevue ? new Date(data.dateLivraisonPrevue) : null,
      notes: data.notes?.trim() || null,
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
  await requireAuth();
  if (!id?.trim()) throw new Error("Identifiant commande manquant.");
  if (!STATUTS_VALIDES.includes(statut)) throw new Error("Statut invalide.");
  await prisma.commandeFournisseur.update({ where: { id }, data: { statut } });
  revalidatePath("/reappro");
}

export async function recevoirCommande(commandeId: string) {
  await requireAuth();
  if (!commandeId?.trim()) throw new Error("Identifiant commande manquant.");

  const commande = await prisma.commandeFournisseur.findUnique({
    where: { id: commandeId },
    include: { lignesCommande: true },
  });
  if (!commande) throw new Error("Commande introuvable.");

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
