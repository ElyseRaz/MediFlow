import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const now = new Date();
  const debutDate = url.searchParams.get("date_debut")
    ? new Date(url.searchParams.get("date_debut")!)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const finDate = url.searchParams.get("date_fin")
    ? new Date(url.searchParams.get("date_fin")! + "T23:59:59")
    : now;

  try {
    const ventes = await prisma.vente.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        statut: "complete",
        createdAt: { gte: debutDate, lte: finDate },
      },
      include: {
        lignesVente: { include: { medicament: { select: { prixAchat: true } } } },
      },
    });

    const topMeds = await prisma.$queryRaw<Array<{ denomination: string; total_vendu: bigint; ca: string }>>`
      SELECT m.denomination,
             SUM(lv.quantite)::bigint AS total_vendu,
             SUM(lv.sous_total)::text AS ca
      FROM ligne_vente lv
      JOIN medicament m ON m.id = lv.medicament_id
      JOIN vente v ON v.id = lv.vente_id
      WHERE v.pharmacie_id = ${user.pharmacieId}::uuid
        AND v.statut = 'complete'
        AND v.created_at >= ${debutDate}
        AND v.created_at <= ${finDate}
      GROUP BY m.denomination
      ORDER BY SUM(lv.sous_total) DESC
      LIMIT 10
    `;

    const caTotal = ventes.reduce((s, v) => s + Number(v.montantTotal), 0);
    const coutTotal = ventes.reduce(
      (s, v) =>
        s + v.lignesVente.reduce((ls, l) => ls + Number(l.medicament.prixAchat) * l.quantite, 0),
      0
    );

    const paiements: Record<string, number> = {};
    for (const v of ventes) {
      paiements[v.modePaiement] = (paiements[v.modePaiement] ?? 0) + Number(v.montantTotal);
    }

    return ok({
      periode: { debut: debutDate, fin: finDate },
      nb_ventes: ventes.length,
      ca_total: caTotal,
      marge_brute: caTotal - coutTotal,
      panier_moyen: ventes.length > 0 ? caTotal / ventes.length : 0,
      repartition_paiement: Object.entries(paiements).map(([mode, montant]) => ({ mode, montant })),
      top_medicaments: (topMeds as any[]).map((r) => ({
        denomination: r.denomination,
        total_vendu: Number(r.total_vendu),
        ca: Number(r.ca),
      })),
    });
  } catch {
    return serverError();
  }
}
