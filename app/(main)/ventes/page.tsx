export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/server-auth";
import { serialize } from "@/lib/serialize";
import { redirect } from "next/navigation";
import POSInterface from "./_components/POSInterface";

export default async function VentesPage() {
  const user = await getServerUser();
  if (!user) redirect("/");

  let medicaments: Awaited<ReturnType<typeof prisma.medicament.findMany<{ include: { categorie: true } }>>> = [];
  let pharmacieId = user.pharmacieId;
  let utilisateurId = user.userId;

  try {
    medicaments = serialize(await prisma.medicament.findMany({
      where: { statut: "actif" },
      include: { categorie: true },
      orderBy: { denomination: "asc" },
    }));
  } catch {
    // Base de données non configurée
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[#1a1e2a] font-bold text-[20px]">Point de vente</h2>
        <p className="text-[#737e94] text-[13px] mt-0.5">Enregistrement des ventes et encaissement</p>
      </div>
      <POSInterface
        medicaments={medicaments}
        pharmacieId={pharmacieId}
        utilisateurId={utilisateurId}
      />
    </div>
  );
}
