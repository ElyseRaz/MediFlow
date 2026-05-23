import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, requireAdmin, serverError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const now = new Date();
    const in90Days = new Date(Date.now() + 90 * 86400000);

    const [sf, ru, ep, ex] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM medicament
        WHERE stock_actuel > 0 AND stock_actuel <= stock_minimum AND statut = 'actif'
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM medicament WHERE stock_actuel = 0 AND statut = 'actif'
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM lot
        WHERE statut = 'disponible' AND date_expiration > ${now} AND date_expiration <= ${in90Days}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM lot
        WHERE statut = 'disponible' AND date_expiration <= ${now}
      `,
    ]);

    return ok({
      scanned_at: now,
      nb_stock_faible: Number(sf[0].count),
      nb_ruptures: Number(ru[0].count),
      nb_expiration_proche: Number(ep[0].count),
      nb_lots_expires: Number(ex[0].count),
      total: Number(sf[0].count) + Number(ru[0].count) + Number(ep[0].count) + Number(ex[0].count),
    });
  } catch {
    return serverError();
  }
}
