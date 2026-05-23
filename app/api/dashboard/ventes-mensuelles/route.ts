import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const annee = parseInt(
      new URL(req.url).searchParams.get("annee") ?? String(new Date().getFullYear())
    );

    const rows = await prisma.$queryRaw<
      { mois: number; ca: number; nb_ventes: number }[]
    >`
      SELECT
        EXTRACT(MONTH FROM created_at)::int  AS mois,
        COALESCE(SUM(montant_total), 0)::float AS ca,
        COUNT(*)::int                         AS nb_ventes
      FROM vente
      WHERE pharmacie_id = ${user.pharmacieId}::uuid
        AND statut = 'complete'
        AND EXTRACT(YEAR FROM created_at) = ${annee}
      GROUP BY mois
      ORDER BY mois
    `;

    // Remplir les 12 mois (avec 0 pour les mois sans ventes)
    const data = Array.from({ length: 12 }, (_, i) => {
      const found = rows.find((r) => r.mois === i + 1);
      return { mois: i + 1, ca: found?.ca ?? 0, nb_ventes: found?.nb_ventes ?? 0 };
    });

    return ok({ annee, data });
  } catch {
    return serverError();
  }
}
