import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, requireAdmin, serverError, parsePagination } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const url = new URL(req.url);
  const medicamentId = url.searchParams.get("medicament_id");
  const type = url.searchParams.get("type");
  const debut = url.searchParams.get("date_debut");
  const fin = url.searchParams.get("date_fin");
  const { skip, limit } = parsePagination(url);

  try {
    const where: Record<string, unknown> = {
      pharmacieId: user!.pharmacieId,
      ...(medicamentId ? { medicamentId } : {}),
      ...(type ? { typeMouvement: type } : {}),
      ...(debut || fin
        ? {
            createdAt: {
              ...(debut ? { gte: new Date(debut) } : {}),
              ...(fin ? { lte: new Date(fin + "T23:59:59") } : {}),
            },
          }
        : {}),
    };

    const [total, mouvements] = await Promise.all([
      prisma.historiqueStock.count({ where }),
      prisma.historiqueStock.findMany({
        where,
        include: {
          medicament: { select: { denomination: true } },
          utilisateur: { select: { nom: true, prenom: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return ok({ total, mouvements });
  } catch {
    return serverError();
  }
}
