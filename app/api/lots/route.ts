import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, created, unauthorized,
  badRequest, requireAdmin, serverError, parsePagination,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const { skip, limit, page } = parsePagination(url);
    const medicament_id = url.searchParams.get("medicament_id");
    const statut = url.searchParams.get("statut");
    const fournisseur_id = url.searchParams.get("fournisseur_id");
    const exp_avant = url.searchParams.get("expiration_avant");
    const exp_apres = url.searchParams.get("expiration_apres");

    const where = {
      ...(medicament_id ? { medicamentId: medicament_id } : {}),
      ...(statut ? { statut: statut as "disponible" | "epuise" | "expire" | "retire" } : {}),
      ...(fournisseur_id ? { medicament: { fournisseurId: fournisseur_id } } : {}),
      ...(exp_avant || exp_apres
        ? {
            dateExpiration: {
              ...(exp_avant ? { lte: new Date(exp_avant) } : {}),
              ...(exp_apres ? { gte: new Date(exp_apres) } : {}),
            },
          }
        : {}),
    };

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: { medicament: true },
        orderBy: { dateExpiration: "asc" },
        skip,
        take: limit,
      }),
      prisma.lot.count({ where }),
    ]);

    return ok({ data: lots, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const { medicament_id, numero_lot, date_expiration, quantite_initiale } = await req.json();

    if (!medicament_id || !numero_lot || !date_expiration || !quantite_initiale) {
      return badRequest("Champs obligatoires manquants.");
    }

    const med = await prisma.medicament.findUnique({ where: { id: medicament_id } });
    if (!med) return badRequest("Médicament introuvable.");

    const lot = await prisma.lot.create({
      data: {
        medicamentId: medicament_id,
        numeroLot: numero_lot,
        dateExpiration: new Date(date_expiration),
        quantite: quantite_initiale,
        quantiteInitiale: quantite_initiale,
        statut: "disponible",
      },
      include: { medicament: true },
    });

    await prisma.medicament.update({
      where: { id: medicament_id },
      data: { stockActuel: { increment: quantite_initiale } },
    });

    return created(lot);
  } catch {
    return serverError();
  }
}
