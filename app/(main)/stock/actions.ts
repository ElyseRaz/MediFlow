"use server";

import { getServerUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { StatutMedicament } from "@prisma/client";

export type MedicamentFormData = {
  denomination: string;
  dci?: string;
  forme?: string;
  dosage?: string;
  conditionnement?: string;
  codeBarres?: string;
  prixAchat: number;
  prixVente: number;
  stockMinimum: number;
  stockActuel: number;
  prescriptionRequise: boolean;
  categorieId?: string;
  fournisseurId?: string;
  statut: StatutMedicament;
};

async function requireAdmin() {
  const user = await getServerUser();
  if (!user) throw new Error("Non authentifié");
  if (user.role !== "admin") throw new Error("Accès refusé — rôle admin requis");
  return user;
}

function validateMedicament(data: MedicamentFormData) {
  if (!data.denomination?.trim()) throw new Error("Le nom du médicament est requis.");
  if (typeof data.prixVente !== "number" || data.prixVente <= 0)
    throw new Error("Le prix de vente doit être supérieur à 0.");
  if (typeof data.prixAchat !== "number" || data.prixAchat < 0)
    throw new Error("Le prix d'achat ne peut pas être négatif.");
  if (data.prixVente < data.prixAchat)
    throw new Error("Le prix de vente doit être ≥ au prix d'achat.");
  if (typeof data.stockActuel !== "number" || data.stockActuel < 0)
    throw new Error("Le stock actuel ne peut pas être négatif.");
  if (typeof data.stockMinimum !== "number" || data.stockMinimum < 0)
    throw new Error("Le stock minimum ne peut pas être négatif.");
}

export async function createMedicament(data: MedicamentFormData) {
  await requireAdmin();
  validateMedicament(data);

  await prisma.medicament.create({
    data: {
      denomination: data.denomination.trim(),
      dci: data.dci?.trim() || null,
      forme: data.forme?.trim() || null,
      dosage: data.dosage?.trim() || null,
      conditionnement: data.conditionnement?.trim() || null,
      codeBarres: data.codeBarres?.trim() || null,
      prixAchat: data.prixAchat,
      prixVente: data.prixVente,
      stockMinimum: data.stockMinimum,
      stockActuel: data.stockActuel,
      prescriptionRequise: data.prescriptionRequise,
      categorieId: data.categorieId || null,
      fournisseurId: data.fournisseurId || null,
      statut: data.statut,
    },
  });
  revalidatePath("/stock");
}

export async function updateMedicament(id: string, data: MedicamentFormData) {
  await requireAdmin();
  validateMedicament(data);

  await prisma.medicament.update({
    where: { id },
    data: {
      denomination: data.denomination.trim(),
      dci: data.dci?.trim() || null,
      forme: data.forme?.trim() || null,
      dosage: data.dosage?.trim() || null,
      conditionnement: data.conditionnement?.trim() || null,
      codeBarres: data.codeBarres?.trim() || null,
      prixAchat: data.prixAchat,
      prixVente: data.prixVente,
      stockMinimum: data.stockMinimum,
      stockActuel: data.stockActuel,
      prescriptionRequise: data.prescriptionRequise,
      categorieId: data.categorieId || null,
      fournisseurId: data.fournisseurId || null,
      statut: data.statut,
    },
  });
  revalidatePath("/stock");
}

export async function deleteMedicament(id: string) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Identifiant manquant.");
  await prisma.medicament.delete({ where: { id } });
  revalidatePath("/stock");
}
