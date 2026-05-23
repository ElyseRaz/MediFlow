import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, unauthorized, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const jours = parseInt(url.searchParams.get("jours") ?? "90");
  const limite = new Date(Date.now() + jours * 86400000);
  const now = new Date();

  try {
    const lots = await prisma.lot.findMany({
      where: {
        statut: "disponible",
        dateExpiration: { lte: limite },
      },
      include: {
        medicament: {
          include: { categorie: { select: { nom: true } } },
        },
      },
      orderBy: { dateExpiration: "asc" },
    });

    let valeurExposee = 0;
    const liste = lots.map((l) => {
      const valeur = Number(l.medicament.prixAchat) * l.quantite;
      valeurExposee += valeur;
      const joursRestants = Math.ceil(
        (new Date(l.dateExpiration).getTime() - now.getTime()) / 86400000
      );
      return {
        id: l.id,
        numero_lot: l.numeroLot,
        denomination: l.medicament.denomination,
        categorie: l.medicament.categorie?.nom ?? "—",
        date_expiration: l.dateExpiration,
        jours_restants: joursRestants,
        quantite: l.quantite,
        valeur_risque: valeur,
        urgent: joursRestants <= 30,
        expire: joursRestants <= 0,
      };
    });

    return ok({
      nb_lots: liste.length,
      valeur_totale_exposee: valeurExposee,
      nb_lots_critiques: liste.filter((l) => l.urgent && !l.expire).length,
      nb_lots_expires: liste.filter((l) => l.expire).length,
      lots: liste,
    });
  } catch {
    return serverError();
  }
}
