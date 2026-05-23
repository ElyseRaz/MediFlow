import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [aggregat, topMedicaments] = await Promise.all([
      prisma.vente.aggregate({
        where: {
          pharmacieId: user.pharmacieId,
          statut: "complete",
          createdAt: { gte: startOfDay },
        },
        _sum: { montantTotal: true },
        _count: true,
      }),
      prisma.$queryRaw<{ denomination: string; quantite: number; ca: number }[]>`
        SELECT m.denomination, SUM(lv.quantite)::int AS quantite, SUM(lv.sous_total)::float AS ca
        FROM ligne_vente lv
        JOIN vente v ON lv.vente_id = v.id
        JOIN medicament m ON lv.medicament_id = m.id
        WHERE v.pharmacie_id = ${user.pharmacieId}::uuid
          AND v.statut = 'complete'
          AND v.created_at >= ${startOfDay}
        GROUP BY m.denomination
        ORDER BY quantite DESC
        LIMIT 5
      `,
    ]);

    const nb_ventes = aggregat._count;
    const ca_total = Number(aggregat._sum.montantTotal ?? 0);

    return ok({
      nb_ventes,
      ca_total,
      panier_moyen: nb_ventes > 0 ? ca_total / nb_ventes : 0,
      top_medicaments: topMedicaments,
    });
  } catch {
    return serverError();
  }
}
