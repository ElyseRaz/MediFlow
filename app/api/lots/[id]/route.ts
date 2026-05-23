import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { medicament: { include: { categorie: true } } },
    });
    if (!lot) return notFound("Lot introuvable.");
    return ok(lot);
  } catch {
    return serverError();
  }
}
