import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const [stockFaible, lotsExpirants] = await Promise.all([
      prisma.$queryRaw<
        { id: string; denomination: string; stock_actuel: number; stock_minimum: number }[]
      >`
        SELECT id, denomination, stock_actuel, stock_minimum
        FROM medicament
        WHERE statut = 'actif'
          AND stock_actuel <= stock_minimum
        ORDER BY (stock_actuel::float / GREATEST(stock_minimum, 1)) ASC
        LIMIT 50
      `,
      prisma.lot.findMany({
        where: {
          statut: "disponible",
          dateExpiration: { lte: in90Days },
        },
        include: { medicament: true },
        orderBy: { dateExpiration: "asc" },
        take: 50,
      }),
    ]);

    const alertes = [
      ...(stockFaible as any[]).map((m) => ({
        type: m.stock_actuel === 0 ? "rupture" : "stock_faible",
        medicamentId: m.id,
        denomination: m.denomination,
        stockActuel: m.stock_actuel,
        stockMinimum: m.stock_minimum,
      })),
      ...lotsExpirants.map((l) => ({
        type: l.dateExpiration < today ? "lot_expire" : "expiration_proche",
        lotId: l.id,
        medicamentId: l.medicamentId,
        denomination: l.medicament.denomination,
        numeroLot: l.numeroLot,
        dateExpiration: l.dateExpiration,
        quantite: l.quantite,
      })),
    ];

    return ok({ count: alertes.length, alertes });
  } catch {
    return serverError();
  }
}
