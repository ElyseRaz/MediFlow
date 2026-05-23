import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

type AlertRow = {
  id: string;
  type_alerte: string;
  denomination: string;
  detail: string;
  lue: boolean;
  lot_id?: string;
  medicament_id: string;
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type_alerte");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);

  try {
    const now = new Date();
    const in90Days = new Date(Date.now() + 90 * 86400000);

    const [stockFaible, ruptures, expirationProche, lotsExpires] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; denomination: string; stock_actuel: number; stock_minimum: number }>>`
        SELECT id, denomination, stock_actuel, stock_minimum
        FROM medicament
        WHERE stock_actuel > 0 AND stock_actuel <= stock_minimum AND statut = 'actif'
        ORDER BY stock_actuel ASC
        LIMIT 100
      `,
      prisma.$queryRaw<Array<{ id: string; denomination: string }>>`
        SELECT id, denomination
        FROM medicament
        WHERE stock_actuel = 0 AND statut = 'actif'
        LIMIT 100
      `,
      prisma.$queryRaw<Array<{ id: string; medicament_id: string; numero_lot: string; date_expiration: Date; denomination: string }>>`
        SELECT l.id, l.medicament_id, l.numero_lot, l.date_expiration, m.denomination
        FROM lot l
        JOIN medicament m ON m.id = l.medicament_id
        WHERE l.statut = 'disponible'
          AND l.date_expiration > ${now}
          AND l.date_expiration <= ${in90Days}
        ORDER BY l.date_expiration ASC
        LIMIT 100
      `,
      prisma.$queryRaw<Array<{ id: string; medicament_id: string; numero_lot: string; date_expiration: Date; denomination: string }>>`
        SELECT l.id, l.medicament_id, l.numero_lot, l.date_expiration, m.denomination
        FROM lot l
        JOIN medicament m ON m.id = l.medicament_id
        WHERE l.statut = 'disponible'
          AND l.date_expiration <= ${now}
        ORDER BY l.date_expiration DESC
        LIMIT 100
      `,
    ]);

    let alertes: AlertRow[] = [
      ...(stockFaible as any[]).map((m) => ({
        id: `stock_${m.id}`,
        type_alerte: "stock_faible",
        medicament_id: m.id,
        denomination: m.denomination,
        detail: `Reste : ${m.stock_actuel} unités (seuil : ${m.stock_minimum})`,
        lue: false,
      })),
      ...(ruptures as any[]).map((m) => ({
        id: `rupture_${m.id}`,
        type_alerte: "rupture",
        medicament_id: m.id,
        denomination: m.denomination,
        detail: "Rupture de stock totale",
        lue: false,
      })),
      ...(expirationProche as any[]).map((l) => {
        const jours = Math.ceil(
          (new Date(l.date_expiration).getTime() - now.getTime()) / 86400000
        );
        return {
          id: `exp_${l.id}`,
          type_alerte: "expiration_proche",
          medicament_id: l.medicament_id,
          lot_id: l.id,
          denomination: l.denomination,
          detail: `Lot ${l.numero_lot} exp. le ${new Date(l.date_expiration).toLocaleDateString("fr-FR")} (${jours}j)`,
          lue: false,
        };
      }),
      ...(lotsExpires as any[]).map((l) => ({
        id: `expire_${l.id}`,
        type_alerte: "lot_expire",
        medicament_id: l.medicament_id,
        lot_id: l.id,
        denomination: l.denomination,
        detail: `Lot ${l.numero_lot} expiré le ${new Date(l.date_expiration).toLocaleDateString("fr-FR")}`,
        lue: false,
      })),
    ];

    if (typeFilter) alertes = alertes.filter((a) => a.type_alerte === typeFilter);
    return ok(alertes.slice(0, limit));
  } catch {
    return serverError();
  }
}
