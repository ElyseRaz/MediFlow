import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const medicaments = await prisma.medicament.findMany({
      where: { statut: "actif" },
      include: {
        lots: { where: { statut: "disponible" }, orderBy: { dateExpiration: "asc" } },
        categorie: { select: { nom: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { denomination: "asc" },
    });

    let valeurTotaleStock = 0;
    const liste = medicaments.map((m) => {
      const valeur = Number(m.prixAchat) * m.stockActuel;
      valeurTotaleStock += valeur;
      return {
        id: m.id,
        denomination: m.denomination,
        dci: m.dci,
        categorie: m.categorie?.nom ?? "—",
        fournisseur: m.fournisseur?.nom ?? "—",
        stock_actuel: m.stockActuel,
        stock_minimum: m.stockMinimum,
        prix_achat: Number(m.prixAchat),
        prix_vente: Number(m.prixVente),
        valeur_stock: valeur,
        nb_lots_actifs: m.lots.length,
        statut_stock:
          m.stockActuel === 0
            ? "rupture"
            : m.stockActuel <= m.stockMinimum
            ? "faible"
            : "ok",
      };
    });

    const top20 = [...liste].sort((a, b) => b.valeur_stock - a.valeur_stock).slice(0, 20);

    return ok({
      valeur_totale_stock: valeurTotaleStock,
      nb_medicaments_actifs: liste.length,
      nb_ruptures: liste.filter((m) => m.statut_stock === "rupture").length,
      nb_stock_faible: liste.filter((m) => m.statut_stock === "faible").length,
      top_20_par_valeur: top20,
      medicaments: liste,
    });
  } catch {
    return serverError();
  }
}
