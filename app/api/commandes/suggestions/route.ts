import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const suggestions = await prisma.$queryRaw<
      { id: string; denomination: string; stock_actuel: number; stock_minimum: number; fournisseur: string | null }[]
    >`
      SELECT m.id, m.denomination, m.stock_actuel, m.stock_minimum,
             f.nom AS fournisseur
      FROM medicament m
      LEFT JOIN fournisseur f ON m.fournisseur_id = f.id
      WHERE m.pharmacie_id = ${user.pharmacieId}::uuid
        AND m.statut = 'actif'
        AND m.stock_actuel <= m.stock_minimum
      ORDER BY (m.stock_actuel::float / GREATEST(m.stock_minimum, 1)) ASC
      LIMIT 30
    `;

    return ok(
      suggestions.map((s) => ({
        ...s,
        quantite_suggeree: Math.max(0, s.stock_minimum * 3 - s.stock_actuel),
      }))
    );
  } catch {
    return serverError();
  }
}
