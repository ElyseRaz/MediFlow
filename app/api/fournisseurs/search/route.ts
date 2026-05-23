import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, badRequest, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length < 2) return badRequest("La recherche doit contenir au moins 2 caractères.");

  try {
    const results = await prisma.fournisseur.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { contact: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { nom: "asc" },
      take: 5,
      select: { id: true, nom: true, contact: true, email: true, actif: true },
    });

    return ok(results);
  } catch {
    return serverError();
  }
}
