"use server";

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

export async function createMedicament(data: MedicamentFormData) {
  await prisma.medicament.create({
    data: {
      denomination: data.denomination,
      dci: data.dci || null,
      forme: data.forme || null,
      dosage: data.dosage || null,
      conditionnement: data.conditionnement || null,
      codeBarres: data.codeBarres || null,
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
  await prisma.medicament.update({
    where: { id },
    data: {
      denomination: data.denomination,
      dci: data.dci || null,
      forme: data.forme || null,
      dosage: data.dosage || null,
      conditionnement: data.conditionnement || null,
      codeBarres: data.codeBarres || null,
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
  await prisma.medicament.delete({ where: { id } });
  revalidatePath("/stock");
}
