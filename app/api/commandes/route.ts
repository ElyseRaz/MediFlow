import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser, ok, created, unauthorized,
  badRequest, requireAdmin, serverError, parsePagination,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const url = new URL(req.url);
    const { skip, limit, page } = parsePagination(url);
    const statut = url.searchParams.get("statut");
    const fournisseur_id = url.searchParams.get("fournisseur_id");
    const date_debut = url.searchParams.get("date_debut");
    const date_fin = url.searchParams.get("date_fin");

    const where = {
      pharmacieId: user.pharmacieId,
      ...(statut ? { statut: statut as "brouillon" | "envoyee" | "recue_partielle" | "recue_complete" | "annulee" } : {}),
      ...(fournisseur_id ? { fournisseurId: fournisseur_id } : {}),
      ...((date_debut || date_fin)
        ? { dateCommande: { ...(date_debut ? { gte: new Date(date_debut) } : {}), ...(date_fin ? { lte: new Date(date_fin) } : {}) } }
        : {}),
    };

    const [commandes, total] = await Promise.all([
      prisma.commandeFournisseur.findMany({
        where,
        include: { fournisseur: true, utilisateur: { select: { nom: true, prenom: true } }, lignesCommande: true },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
      }),
      prisma.commandeFournisseur.count({ where }),
    ]);

    return ok({ data: commandes, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const { fournisseur_id, lignes, date_livraison_prevue, notes } = await req.json();
    if (!fournisseur_id || !lignes?.length) return badRequest("fournisseur_id et lignes requis.");

    const montantTotal = lignes.reduce(
      (s: number, l: { quantite_commandee: number; prix_unitaire: number }) =>
        s + l.quantite_commandee * l.prix_unitaire,
      0
    );

    const count = await prisma.commandeFournisseur.count();
    const numeroCommande = `CMD-${String(count + 1).padStart(5, "0")}`;

    const commande = await prisma.commandeFournisseur.create({
      data: {
        pharmacieId: user!.pharmacieId,
        fournisseurId: fournisseur_id,
        utilisateurId: user!.userId,
        numeroCommande,
        dateLivraisonPrevue: date_livraison_prevue ? new Date(date_livraison_prevue) : null,
        notes: notes || null,
        montantTotal,
        lignesCommande: {
          create: lignes.map((l: { medicament_id: string; quantite_commandee: number; prix_unitaire: number }) => ({
            medicamentId: l.medicament_id,
            quantiteCommandee: l.quantite_commandee,
            quantiteRecue: 0,
            prixUnitaire: l.prix_unitaire,
            sousTotal: l.quantite_commandee * l.prix_unitaire,
          })),
        },
      },
      include: { fournisseur: true, lignesCommande: { include: { medicament: true } } },
    });

    return created(commande);
  } catch {
    return serverError();
  }
}
