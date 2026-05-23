import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, requireAdmin, badRequest, serverError } from "@/lib/api-helpers";

const TRANSITIONS: Record<string, string[]> = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["recue_partielle", "recue_complete", "annulee"],
  recue_partielle: ["recue_complete", "annulee"],
  recue_complete: [],
  annulee: [],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { statut } = await req.json();
    const commande = await prisma.commandeFournisseur.findFirst({
      where: { id, pharmacieId: user!.pharmacieId },
      include: { lignesCommande: true },
    });
    if (!commande) return notFound("Commande introuvable.");

    const allowed = TRANSITIONS[commande.statut] ?? [];
    if (!allowed.includes(statut)) {
      return badRequest(`Transition ${commande.statut} → ${statut} non autorisée.`);
    }

    const updated = await prisma.commandeFournisseur.update({
      where: { id },
      data: { statut: statut as "brouillon" | "envoyee" | "recue_partielle" | "recue_complete" | "annulee" },
    });

    return ok(updated);
  } catch {
    return serverError();
  }
}
