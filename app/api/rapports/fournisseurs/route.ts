import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, requireAdmin, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const url = new URL(req.url);
  const now = new Date();
  const debutDate = url.searchParams.get("date_debut")
    ? new Date(url.searchParams.get("date_debut")!)
    : new Date(now.getFullYear(), 0, 1);
  const finDate = url.searchParams.get("date_fin")
    ? new Date(url.searchParams.get("date_fin")! + "T23:59:59")
    : now;

  try {
    const commandes = await prisma.commandeFournisseur.findMany({
      where: {
        pharmacieId: user!.pharmacieId,
        statut: { in: ["recue_partielle", "recue_complete"] },
        createdAt: { gte: debutDate, lte: finDate },
      },
      include: { fournisseur: true },
    });

    const byFournisseur: Record<string, { nom: string; nb_commandes: number; ca_total: number }> = {};
    for (const c of commandes) {
      const fid = c.fournisseurId;
      if (!byFournisseur[fid]) {
        byFournisseur[fid] = { nom: c.fournisseur.nom, nb_commandes: 0, ca_total: 0 };
      }
      byFournisseur[fid].nb_commandes++;
      byFournisseur[fid].ca_total += Number(c.montantTotal);
    }

    const liste = Object.values(byFournisseur).sort((a, b) => b.ca_total - a.ca_total);

    return ok({
      periode: { debut: debutDate, fin: finDate },
      nb_fournisseurs_actifs: liste.length,
      ca_total_achats: liste.reduce((s, f) => s + f.ca_total, 0),
      fournisseurs: liste,
    });
  } catch {
    return serverError();
  }
}
