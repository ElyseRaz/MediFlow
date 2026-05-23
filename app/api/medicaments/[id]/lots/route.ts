import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const med = await prisma.medicament.findUnique({ where: { id } });
    if (!med) return notFound("Médicament introuvable.");

    const lots = await prisma.lot.findMany({
      where: { medicamentId: id, statut: "disponible" },
      orderBy: { dateExpiration: "asc" },
    });
    return ok(lots);
  } catch {
    return serverError();
  }
}
