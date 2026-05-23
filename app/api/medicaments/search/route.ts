import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, badRequest, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length < 2) return badRequest("La recherche doit contenir au moins 2 caractères.");

  try {
    const results = await prisma.medicament.findMany({
      where: {
        statut: "actif",
        OR: [
          { denomination: { contains: q, mode: "insensitive" } },
          { dci: { contains: q, mode: "insensitive" } },
          { codeBarres: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { categorie: true },
      orderBy: { denomination: "asc" },
      take: 10,
    });

    return ok(results);
  } catch {
    return serverError();
  }
}
