"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type FournisseurFormData = {
  nom: string;
  contact?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  actif: boolean;
};

export async function createFournisseur(data: FournisseurFormData) {
  await prisma.fournisseur.create({
    data: {
      nom: data.nom,
      contact: data.contact || null,
      telephone: data.telephone || null,
      email: data.email || null,
      adresse: data.adresse || null,
      actif: data.actif,
    },
  });
  revalidatePath("/fournisseurs");
}

export async function updateFournisseur(id: string, data: FournisseurFormData) {
  await prisma.fournisseur.update({
    where: { id },
    data: {
      nom: data.nom,
      contact: data.contact || null,
      telephone: data.telephone || null,
      email: data.email || null,
      adresse: data.adresse || null,
      actif: data.actif,
    },
  });
  revalidatePath("/fournisseurs");
}

export async function toggleFournisseurActif(id: string, actif: boolean) {
  await prisma.fournisseur.update({ where: { id }, data: { actif } });
  revalidatePath("/fournisseurs");
}
