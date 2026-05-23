import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, notFound, requireAdmin, serverError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await params;
  try {
    const { actif } = await req.json();
    const f = await prisma.fournisseur.findUnique({ where: { id } });
    if (!f) return notFound("Fournisseur introuvable.");

    const updated = await prisma.fournisseur.update({ where: { id }, data: { actif } });
    return ok(updated);
  } catch {
    return serverError();
  }
}
