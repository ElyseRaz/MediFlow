import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, requireAdmin, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const medicaments = await prisma.medicament.findMany({
      include: {
        lots: {
          where: { statut: "disponible" },
          orderBy: { dateExpiration: "asc" },
        },
        categorie: { select: { nom: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { denomination: "asc" },
    });

    let valeurTotale = 0;
    const inventaire = medicaments.map((m) => {
      const valeur = Number(m.prixAchat) * m.stockActuel;
      valeurTotale += valeur;
      return {
        id: m.id,
        denomination: m.denomination,
        dci: m.dci,
        forme: m.forme,
        dosage: m.dosage,
        categorie: m.categorie?.nom ?? "—",
        fournisseur: m.fournisseur?.nom ?? "—",
        code_barres: m.codeBarres,
        stock_actuel: m.stockActuel,
        stock_minimum: m.stockMinimum,
        prix_achat: Number(m.prixAchat),
        prix_vente: Number(m.prixVente),
        valeur_stock: valeur,
        statut: m.statut,
        lots: m.lots.map((l) => ({
          id: l.id,
          numero_lot: l.numeroLot,
          quantite: l.quantite,
          date_expiration: l.dateExpiration,
        })),
      };
    });

    return ok({
      date_inventaire: new Date(),
      nb_references: inventaire.length,
      valeur_totale_stock: valeurTotale,
      inventaire,
    });
  } catch {
    return serverError();
  }
}
