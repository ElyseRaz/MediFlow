export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import HistoriqueTable from "./_components/HistoriqueTable";

export default async function HistoriquePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  let isAdmin = false;
  if (token) {
    const payload = await verifyAccessToken(token);
    isAdmin = payload?.role === "admin";
  }

  let ventes: Awaited<ReturnType<typeof prisma.vente.findMany<{
    include: { utilisateur: true; lignesVente: { include: { medicament: true } } }
  }>>> = [];

  try {
    ventes = serialize(await prisma.vente.findMany({
      include: {
        utilisateur: true,
        lignesVente: {
          include: { medicament: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }));
  } catch {
    // Base de données non configurée
  }

  return (
    <div className="space-y-5">
      <HistoriqueTable ventes={ventes} isAdmin={isAdmin} />
    </div>
  );
}
