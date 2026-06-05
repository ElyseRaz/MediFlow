export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/server-auth";
import { serialize } from "@/lib/serialize";
import { redirect } from "next/navigation";
import ReapproClient from "./_components/ReapproClient";

export default async function ReapproPage() {
  const user = await getServerUser();
  if (!user) redirect("/");

  let commandes: Awaited<ReturnType<typeof prisma.commandeFournisseur.findMany<{
    include: { fournisseur: true; utilisateur: true; lignesCommande: { include: { medicament: true } } }
  }>>> = [];
  let fournisseurs: Awaited<ReturnType<typeof prisma.fournisseur.findMany>> = [];
  let medicaments: Awaited<ReturnType<typeof prisma.medicament.findMany>> = [];

  try {
    const [rawCommandes, fours, rawMeds] = await Promise.all([
      prisma.commandeFournisseur.findMany({
        include: {
          fournisseur: true,
          utilisateur: true,
          lignesCommande: { include: { medicament: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.fournisseur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
      prisma.medicament.findMany({ orderBy: { denomination: "asc" } }),
    ]);
    commandes = serialize(rawCommandes);
    fournisseurs = fours;
    medicaments = serialize(rawMeds);
  } catch {
    // Base de données non configurée
  }

  return (
    <div className="space-y-5">
      <ReapproClient
        commandes={commandes}
        fournisseurs={fournisseurs}
        medicaments={medicaments}
      />
    </div>
  );
}
