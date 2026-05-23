import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      nb_medicaments,
      ventesJour,
      nb_fournisseurs,
      lotsExpirants,
      stockFaibleRaw,
    ] = await Promise.all([
      prisma.medicament.count({ where: { statut: "actif" } }),

      prisma.vente.aggregate({
        where: {
          pharmacieId: user.pharmacieId,
          statut: "complete",
          createdAt: { gte: startOfDay },
        },
        _sum: { montantTotal: true },
        _count: true,
      }),

      prisma.fournisseur.count({ where: { actif: true } }),

      prisma.lot.count({
        where: {
          statut: "disponible",
          dateExpiration: { lte: in90Days, gte: today },
        },
      }),

      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM medicament
        WHERE statut = 'actif' AND stock_actuel <= stock_minimum
      `,
    ]);

    return ok({
      nb_medicaments,
      ca_jour: Number(ventesJour._sum.montantTotal ?? 0),
      nb_ventes_jour: ventesJour._count,
      nb_fournisseurs,
      nb_alertes_expiration: lotsExpirants,
      stock_faible_count: Number(stockFaibleRaw[0]?.count ?? 0),
    });
  } catch {
    return serverError();
  }
}
