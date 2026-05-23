import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, created, unauthorized, badRequest,
  requireAdmin, parsePagination, serverError,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url);
    const search = url.searchParams.get("search") ?? "";
    const categorie = url.searchParams.get("categorie");
    const fournisseur_id = url.searchParams.get("fournisseur_id");
    const actif = url.searchParams.get("actif");

    const where = {
      ...(actif === "false" ? { statut: "inactif" as const } : { statut: "actif" as const }),
      ...(categorie ? { categorieId: categorie } : {}),
      ...(fournisseur_id ? { fournisseurId: fournisseur_id } : {}),
      ...(search
        ? {
            OR: [
              { denomination: { contains: search, mode: "insensitive" as const } },
              { dci: { contains: search, mode: "insensitive" as const } },
              { codeBarres: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [medicaments, total] = await Promise.all([
      prisma.medicament.findMany({
        where,
        include: { categorie: true, fournisseur: true },
        orderBy: { denomination: "asc" },
        skip,
        take: limit,
      }),
      prisma.medicament.count({ where }),
    ]);

    return ok({ data: medicaments, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const body = await req.json();
    const {
      denomination, dci, forme, dosage, conditionnement, codeBarres,
      prixAchat, prixVente, stockMinimum, stockActuel,
      prescriptionRequise, categorieId, fournisseurId, statut,
    } = body;

    if (!denomination) return badRequest("La dénomination est requise.");
    if (Number(prixVente) < Number(prixAchat))
      return badRequest("Le prix de vente doit être ≥ au prix d'achat.");

    const med = await prisma.medicament.create({
      data: {
        denomination,
        dci: dci || null,
        forme: forme || null,
        dosage: dosage || null,
        conditionnement: conditionnement || null,
        codeBarres: codeBarres || null,
        prixAchat,
        prixVente,
        stockMinimum: stockMinimum ?? 10,
        stockActuel: stockActuel ?? 0,
        prescriptionRequise: prescriptionRequise ?? false,
        categorieId: categorieId || null,
        fournisseurId: fournisseurId || null,
        statut: statut ?? "actif",
      },
      include: { categorie: true, fournisseur: true },
    });

    return created(med);
  } catch {
    return serverError();
  }
}
