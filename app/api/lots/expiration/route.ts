import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const jours = parseInt(new URL(req.url).searchParams.get("jours") ?? "90");
    const limite = new Date(Date.now() + jours * 24 * 60 * 60 * 1000);

    const lots = await prisma.lot.findMany({
      where: {
        statut: "disponible",
        dateExpiration: { lte: limite },
      },
      include: { medicament: true },
      orderBy: { dateExpiration: "asc" },
    });

    return ok({ jours, count: lots.length, lots });
  } catch {
    return serverError();
  }
}
