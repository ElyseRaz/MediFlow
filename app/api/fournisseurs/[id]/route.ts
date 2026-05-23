import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, requireAdmin, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const f = await prisma.fournisseur.findUnique({ where: { id } });
    if (!f) return notFound("Fournisseur introuvable.");

    const commandes = await prisma.commandeFournisseur.findMany({
      where: { fournisseurId: id, pharmacieId: user.pharmacieId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return ok({ ...f, commandes });
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
    const f = await prisma.fournisseur.findUnique({ where: { id } });
    if (!f) return notFound("Fournisseur introuvable.");

    const updated = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom: body.nom ?? f.nom,
        contact: body.contact ?? f.contact,
        email: body.email ?? f.email,
        telephone: body.telephone ?? f.telephone,
        adresse: body.adresse ?? f.adresse,
      },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
