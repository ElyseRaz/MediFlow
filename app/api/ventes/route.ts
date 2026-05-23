import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ok, created, unauthorized, badRequest, serverError, parsePagination } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const { skip, limit, page } = parsePagination(url);
    const date_debut = url.searchParams.get("date_debut");
    const date_fin = url.searchParams.get("date_fin");
    const caissier_id = url.searchParams.get("caissier_id");
    const statut = url.searchParams.get("statut");
    const mode_paiement = url.searchParams.get("mode_paiement");

    const where = {
      pharmacieId: user.pharmacieId,
      ...(statut ? { statut: statut as "complete" | "annulee" | "remboursee" } : {}),
      ...(mode_paiement ? { modePaiement: mode_paiement as "especes" | "carte_bancaire" | "mobile_money" | "virement" } : {}),
      ...(caissier_id ? { utilisateurId: caissier_id } : {}),
      ...((date_debut || date_fin)
        ? {
            createdAt: {
              ...(date_debut ? { gte: new Date(date_debut) } : {}),
              ...(date_fin ? { lte: new Date(date_fin) } : {}),
            },
          }
        : {}),
    };

    const [ventes, total] = await Promise.all([
      prisma.vente.findMany({
        where,
        include: {
          utilisateur: { select: { nom: true, prenom: true, role: true } },
          lignesVente: { include: { medicament: true } },
        },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
      }),
      prisma.vente.count({ where }),
    ]);

    return ok({ data: ventes, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { lignes, mode_paiement, montant_paye, remise = 0, notes } = await req.json();

    if (!lignes?.length) return badRequest("Aucune ligne de vente fournie.");
    if (!mode_paiement) return badRequest("Mode de paiement requis.");

    // Vérifier le stock de chaque lot
    for (const l of lignes) {
      if (!l.lot_id && !l.medicament_id) return badRequest("lot_id ou medicament_id requis par ligne.");
    }

    // Récupérer les lots FIFO si lot_id non fourni
    const lignesResolues = await Promise.all(
      lignes.map(async (l: { lot_id?: string; medicament_id?: string; quantite: number }) => {
        if (l.lot_id) {
          const lot = await prisma.lot.findUnique({ where: { id: l.lot_id }, include: { medicament: true } });
          if (!lot || lot.quantite < l.quantite) throw new Error(`Stock insuffisant pour le lot ${l.lot_id}`);
          return { lot, quantite: l.quantite, prixUnitaire: Number(lot.medicament.prixVente) };
        }
        const lot = await prisma.lot.findFirst({
          where: { medicamentId: l.medicament_id, statut: "disponible", quantite: { gte: l.quantite } },
          include: { medicament: true },
          orderBy: { dateExpiration: "asc" },
        });
        if (!lot) throw new Error(`Stock insuffisant pour le médicament ${l.medicament_id}`);
        return { lot, quantite: l.quantite, prixUnitaire: Number(lot.medicament.prixVente) };
      })
    ).catch((e) => { throw new Error(e.message); });

    const montantTotal = (lignesResolues as { lot: { id: string; medicamentId: string }; quantite: number; prixUnitaire: number }[]).reduce(
      (s, l) => s + l.prixUnitaire * l.quantite,
      0
    ) * (1 - remise / 100);

    if (montant_paye < montantTotal) return badRequest("Montant payé insuffisant.");

    const count = await prisma.vente.count();
    const numeroVente = `V-${String(count + 1).padStart(5, "0")}`;

    const vente = await prisma.vente.create({
      data: {
        pharmacieId: user.pharmacieId,
        utilisateurId: user.userId,
        numeroVente,
        modePaiement: mode_paiement,
        montantTotal,
        montantPaye: montant_paye,
        monnaie: Math.max(0, montant_paye - montantTotal),
        notes: notes || null,
        lignesVente: {
          create: (lignesResolues as { lot: { id: string; medicamentId: string }; quantite: number; prixUnitaire: number }[]).map((l) => ({
            medicamentId: l.lot.medicamentId,
            lotId: l.lot.id,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            sousTotal: l.prixUnitaire * l.quantite,
          })),
        },
      },
      include: { lignesVente: { include: { medicament: true } } },
    });

    // Décrémenter les stocks
    for (const l of lignesResolues as { lot: { id: string; medicamentId: string }; quantite: number; prixUnitaire: number }[]) {
      await Promise.all([
        prisma.lot.update({ where: { id: l.lot.id }, data: { quantite: { decrement: l.quantite } } }),
        prisma.medicament.update({ where: { id: l.lot.medicamentId }, data: { stockActuel: { decrement: l.quantite } } }),
      ]);
    }

    return created(vente);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return badRequest(msg);
  }
}
