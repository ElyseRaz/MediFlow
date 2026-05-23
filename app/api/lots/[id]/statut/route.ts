import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, unauthorized, notFound,
  requireAdmin, badRequest, serverError,
} from "@/lib/api-helpers";

const STATUTS_VALIDES = ["disponible", "epuise", "retire", "expire"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { statut } = await req.json();
    if (!STATUTS_VALIDES.includes(statut)) {
      return badRequest(`Statut invalide. Valeurs acceptées : ${STATUTS_VALIDES.join(", ")}`);
    }

    const lot = await prisma.lot.findUnique({ where: { id } });
    if (!lot) return notFound("Lot introuvable.");

    const updated = await prisma.lot.update({
      where: { id },
      data: { statut: statut as "disponible" | "epuise" | "expire" | "retire" },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
