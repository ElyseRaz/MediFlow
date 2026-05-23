import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, badRequest, serverError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { lignes } = await req.json();
    if (!lignes?.length) return badRequest("Aucune ligne fournie.");

    const result = await Promise.all(
      lignes.map(async (l: { medicament_id: string; quantite: number }) => {
        const lot = await prisma.lot.findFirst({
          where: {
            medicamentId: l.medicament_id,
            statut: "disponible",
            quantite: { gte: l.quantite },
          },
          include: { medicament: true },
          orderBy: { dateExpiration: "asc" },
        });

        return {
          medicament_id: l.medicament_id,
          quantite_demandee: l.quantite,
          disponible: !!lot,
          lot_id: lot?.id ?? null,
          stock_actuel: lot?.quantite ?? 0,
          prix_unitaire: lot ? Number(lot.medicament.prixVente) : null,
        };
      })
    );

    const tout_disponible = result.every((r) => r.disponible);
    return ok({ tout_disponible, lignes: result });
  } catch {
    return serverError();
  }
}
