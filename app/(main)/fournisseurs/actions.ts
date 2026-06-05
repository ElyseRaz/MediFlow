"use server";

import { getServerUser } from "@/lib/server-auth";
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

async function requireAdmin() {
  const user = await getServerUser();
  if (!user) throw new Error("Non authentifié");
  if (user.role !== "admin") throw new Error("Accès refusé — rôle admin requis");
  return user;
}

function validateFournisseur(data: FournisseurFormData) {
  if (!data.nom?.trim()) throw new Error("Le nom du fournisseur est requis.");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new Error("Adresse email invalide.");
}

export async function createFournisseur(data: FournisseurFormData) {
  await requireAdmin();
  validateFournisseur(data);

  await prisma.fournisseur.create({
    data: {
      nom: data.nom.trim(),
      contact: data.contact?.trim() || null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim() || null,
      adresse: data.adresse?.trim() || null,
      actif: data.actif,
    },
  });
  revalidatePath("/fournisseurs");
}

export async function updateFournisseur(id: string, data: FournisseurFormData) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Identifiant fournisseur manquant.");
  validateFournisseur(data);

  await prisma.fournisseur.update({
    where: { id },
    data: {
      nom: data.nom.trim(),
      contact: data.contact?.trim() || null,
      telephone: data.telephone?.trim() || null,
      email: data.email?.trim() || null,
      adresse: data.adresse?.trim() || null,
      actif: data.actif,
    },
  });
  revalidatePath("/fournisseurs");
}

export async function toggleFournisseurActif(id: string, actif: boolean) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Identifiant fournisseur manquant.");
  if (typeof actif !== "boolean") throw new Error("Valeur invalide.");
  await prisma.fournisseur.update({ where: { id }, data: { actif } });
  revalidatePath("/fournisseurs");
}
