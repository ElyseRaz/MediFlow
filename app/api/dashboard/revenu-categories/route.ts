import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const now = new Date();
    const mois = parseInt(url.searchParams.get("mois") ?? String(now.getMonth() + 1));
    const annee = parseInt(url.searchParams.get("annee") ?? String(now.getFullYear()));

    const rows = await prisma.$queryRaw<
      { categorie: string; montant: number }[]
    >`
      SELECT
        COALESCE(c.nom, 'Sans catégorie') AS categorie,
        COALESCE(SUM(lv.sous_total), 0)::float AS montant
      FROM ligne_vente lv
      JOIN vente v ON lv.vente_id = v.id
      JOIN medicament m ON lv.medicament_id = m.id
      LEFT JOIN categorie c ON m.categorie_id = c.id
      WHERE v.pharmacie_id = ${user.pharmacieId}::uuid
        AND v.statut = 'complete'
        AND EXTRACT(MONTH FROM v.created_at) = ${mois}
        AND EXTRACT(YEAR FROM v.created_at) = ${annee}
      GROUP BY c.nom
      ORDER BY montant DESC
    `;

    const total = rows.reduce((s, r) => s + r.montant, 0);
    const data = rows.map((r) => ({
      categorie: r.categorie,
      montant: r.montant,
      pourcentage: total > 0 ? Math.round((r.montant / total) * 100) : 0,
    }));

    return ok({ mois, annee, total, data });
  } catch {
    return serverError();
  }
}
