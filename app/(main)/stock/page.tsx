export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import StockTable from "./_components/StockTable";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let medicaments: Awaited<ReturnType<typeof prisma.medicament.findMany<{ include: { categorie: true; fournisseur: true } }>>> = [];
  let categories: Awaited<ReturnType<typeof prisma.categorie.findMany>> = [];
  let fournisseurs: Awaited<ReturnType<typeof prisma.fournisseur.findMany>> = [];

  try {
    const [rawMeds, cats, fours] = await Promise.all([
      prisma.medicament.findMany({
        include: { categorie: true, fournisseur: true },
        orderBy: { denomination: "asc" },
      }),
      prisma.categorie.findMany({ orderBy: { nom: "asc" } }),
      prisma.fournisseur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    ]);
    medicaments = serialize(rawMeds);
    categories = cats;
    fournisseurs = fours;
  } catch {
    // La base de données n'est pas encore configurée
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[#1a1e2a] font-bold text-[20px]">Stock de médicaments</h2>
        <p className="text-[#737e94] text-[13px] mt-0.5">Gérez l&apos;inventaire et les niveaux de stock</p>
      </div>
      <StockTable
        medicaments={medicaments}
        categories={categories}
        fournisseurs={fournisseurs}
        initialSearch={q}
      />
    </div>
  );
}
