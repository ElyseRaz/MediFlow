import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const vente = await prisma.vente.findFirst({
      where: { id, pharmacieId: user.pharmacieId },
      include: {
        utilisateur: { select: { nom: true, prenom: true, role: true } },
        lignesVente: {
          include: {
            medicament: true,
            lot: true,
          },
        },
      },
    });
    if (!vente) return notFound("Vente introuvable.");
    return ok(vente);
  } catch {
    return serverError();
  }
}
