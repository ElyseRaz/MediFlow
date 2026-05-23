import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (user) {
    // Révoquer tous les refresh tokens de cet utilisateur
    await prisma.sessionToken.deleteMany({ where: { utilisateurId: user.userId } });
  }

  const res = NextResponse.json({ message: "Déconnecté." });
  res.cookies.delete("access_token");
  res.cookies.delete("refresh_token");
  return res;
}
