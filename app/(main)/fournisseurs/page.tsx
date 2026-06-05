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
      <FournisseursClient fournisseurs={fournisseurs} initialSearch={q} />
    </div>
  );
}
