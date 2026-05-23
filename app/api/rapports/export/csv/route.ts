import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAdmin, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "stock";

  try {
    let csv = "";
    let filename = "";

    if (type === "stock") {
      const meds = await prisma.medicament.findMany({
        include: { categorie: true, fournisseur: true },
        orderBy: { denomination: "asc" },
      });
      csv = toCsv(
        ["Dénomination", "DCI", "Catégorie", "Fournisseur", "Stock actuel", "Stock minimum", "Prix achat", "Prix vente", "Statut"],
        meds.map((m) => [
          m.denomination, m.dci ?? "", m.categorie?.nom ?? "",
          m.fournisseur?.nom ?? "", m.stockActuel, m.stockMinimum,
          Number(m.prixAchat), Number(m.prixVente), m.statut,
        ])
      );
      filename = "stock.csv";
    } else if (type === "ventes") {
      const ventes = await prisma.vente.findMany({
        where: { pharmacieId: user!.pharmacieId },
        include: { utilisateur: { select: { nom: true, prenom: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      csv = toCsv(
        ["N° Vente", "Date", "Caissier", "Mode paiement", "Montant total", "Statut"],
        ventes.map((v) => [
          v.numeroVente,
          v.createdAt.toISOString(),
          `${v.utilisateur.prenom} ${v.utilisateur.nom}`,
          v.modePaiement,
          Number(v.montantTotal),
          v.statut,
        ])
      );
      filename = "ventes.csv";
    } else if (type === "commandes") {
      const commandes = await prisma.commandeFournisseur.findMany({
        where: { pharmacieId: user!.pharmacieId },
        include: {
          fournisseur: true,
          utilisateur: { select: { nom: true, prenom: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      csv = toCsv(
        ["N° Commande", "Date", "Fournisseur", "Créateur", "Montant", "Statut"],
        commandes.map((c) => [
          c.numeroCommande,
          c.dateCommande.toISOString(),
          c.fournisseur.nom,
          `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
          Number(c.montantTotal),
          c.statut,
        ])
      );
      filename = "commandes.csv";
    } else {
      return NextResponse.json(
        { error: "Type invalide. Valeurs acceptées : stock, ventes, commandes" },
        { status: 400 }
      );
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return serverError();
  }
}
