export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import FournisseursClient from "./_components/FournisseursClient";

export default async function FournisseursPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let fournisseurs: Awaited<ReturnType<typeof prisma.fournisseur.findMany>> = [];

  try {
    fournisseurs = await prisma.fournisseur.findMany({ orderBy: { nom: "asc" } });
  } catch {
    // Base de données non configurée
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-ink font-bold text-[20px]">Fournisseurs</h2>
        <p className="text-subtle text-[13px] mt-0.5">Gestion des partenaires et fournisseurs</p>
      </div>
      <FournisseursClient fournisseurs={fournisseurs} initialSearch={q} />
    </div>
  );
}
