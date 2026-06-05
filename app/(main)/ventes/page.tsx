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
      <POSInterface medicaments={medicaments} />
    </div>
  );
}
