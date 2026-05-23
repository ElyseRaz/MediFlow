import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, unauthorized, notFound,
  requireAdmin, badRequest, serverError,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const med = await prisma.medicament.findUnique({
      where: { id },
      include: {
        categorie: true,
        fournisseur: true,
        lots: { where: { statut: "disponible" }, orderBy: { dateExpiration: "asc" } },
      },
    });
    if (!med) return notFound("Médicament introuvable.");
    return ok(med);
  } catch {
    return serverError();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await prisma.medicament.findUnique({ where: { id } });
    if (!existing) return notFound("Médicament introuvable.");

    if (body.prixVente !== undefined && body.prixAchat !== undefined) {
      if (Number(body.prixVente) < Number(body.prixAchat))
        return badRequest("Le prix de vente doit être ≥ au prix d'achat.");
    }

    const updated = await prisma.medicament.update({
      where: { id },
      data: {
        denomination: body.denomination ?? existing.denomination,
        dci: body.dci ?? existing.dci,
        forme: body.forme ?? existing.forme,
        dosage: body.dosage ?? existing.dosage,
        conditionnement: body.conditionnement ?? existing.conditionnement,
        codeBarres: body.codeBarres ?? existing.codeBarres,
        prixAchat: body.prixAchat ?? existing.prixAchat,
        prixVente: body.prixVente ?? existing.prixVente,
        stockMinimum: body.stockMinimum ?? existing.stockMinimum,
        prescriptionRequise: body.prescriptionRequise ?? existing.prescriptionRequise,
        categorieId: body.categorieId ?? existing.categorieId,
        fournisseurId: body.fournisseurId ?? existing.fournisseurId,
        statut: body.statut ?? existing.statut,
      },
      include: { categorie: true, fournisseur: true },
    });

    return ok(updated);
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { actif } = await req.json();
    const existing = await prisma.medicament.findUnique({ where: { id } });
    if (!existing) return notFound("Médicament introuvable.");

    const updated = await prisma.medicament.update({
      where: { id },
      data: { statut: actif ? "actif" : "inactif" },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
