import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/server-auth";
import {
  FiPackage, FiTrendingUp, FiTruck, FiClock, FiAlertTriangle,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export const dynamic = "force-dynamic";

const MOIS_LETTRES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const SEGMENT_COLORS = ["#0F6E56", "#1D9E75", "#EF9F27", "#8c4ee9", "#E24B4A"];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  complete:   { label: "Payé",   bg: "#e8f8f3", text: "#5DCAA5" },
  annulee:    { label: "Annulé", bg: "#fdedec", text: "#E24B4A" },
  remboursee: { label: "Remb.",  bg: "#fef3e2", text: "#EF9F27" },
};

type KpiMeta = {
  Icon: IconType;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  trend: string;
  valueColor: string;
};

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in90Days = new Date(Date.now() + 90 * 86400000);
  const moisActuel = now.getMonth() + 1;
  const anneeActuelle = now.getFullYear();

  const [
    nbMedicaments,
    ventesJour,
    nbFournisseurs,
    stockFaibleRaw,
    alertesExpirationRaw,
    ventesRecentes,
    ventesParMoisRaw,
    revenusCategoriesRaw,
    alertesStockFaible,
    lotsExpirants,
  ] = await Promise.all([
    prisma.medicament.count({ where: { statut: "actif" } }),

    prisma.vente.aggregate({
      where: {
        pharmacieId: user.pharmacieId,
        statut: "complete",
        createdAt: { gte: todayStart },
      },
      _sum: { montantTotal: true },
      _count: true,
    }),

    prisma.fournisseur.count({ where: { actif: true } }),

    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM medicament
      WHERE stock_actuel <= stock_minimum AND statut = 'actif'
    `,

    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM lot
      WHERE statut = 'disponible' AND date_expiration > ${now} AND date_expiration <= ${in90Days}
    `,

    prisma.vente.findMany({
      where: { pharmacieId: user.pharmacieId },
      include: {
        lignesVente: {
          include: { medicament: { select: { denomination: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    prisma.$queryRaw<Array<{ mois: number; ca: string; nb_ventes: bigint }>>`
      SELECT
        EXTRACT(MONTH FROM created_at)::int AS mois,
        COALESCE(SUM(montant_total), 0)::text AS ca,
        COUNT(*)::bigint AS nb_ventes
      FROM vente
      WHERE pharmacie_id = ${user.pharmacieId}::uuid
        AND statut = 'complete'
        AND EXTRACT(YEAR FROM created_at) = ${anneeActuelle}
      GROUP BY mois
      ORDER BY mois
    `,

    prisma.$queryRaw<Array<{ categorie: string; montant: string }>>`
      SELECT
        COALESCE(c.nom, 'Autre') AS categorie,
        SUM(lv.sous_total)::text AS montant
      FROM ligne_vente lv
      JOIN medicament m ON m.id = lv.medicament_id
      LEFT JOIN categorie c ON c.id = m.categorie_id
      JOIN vente v ON v.id = lv.vente_id
      WHERE v.pharmacie_id = ${user.pharmacieId}::uuid
        AND v.statut = 'complete'
        AND EXTRACT(MONTH FROM v.created_at) = ${moisActuel}
        AND EXTRACT(YEAR FROM v.created_at) = ${anneeActuelle}
      GROUP BY c.nom
      ORDER BY SUM(lv.sous_total) DESC
      LIMIT 5
    `,

    prisma.$queryRaw<Array<{ id: string; denomination: string; stock_actuel: number; stock_minimum: number }>>`
      SELECT id, denomination, stock_actuel, stock_minimum
      FROM medicament
      WHERE stock_actuel <= stock_minimum AND statut = 'actif'
      ORDER BY stock_actuel ASC
      LIMIT 3
    `,

    prisma.lot.findMany({
      where: { statut: "disponible", dateExpiration: { gt: now, lte: in90Days } },
      include: { medicament: { select: { denomination: true } } },
      orderBy: { dateExpiration: "asc" },
      take: 3,
    }),
  ]);

  const caJour = Number(ventesJour._sum.montantTotal ?? 0);
  const nbStockFaible = Number(stockFaibleRaw[0]?.count ?? 0);
  const nbAlertesExpiration = Number(alertesExpirationRaw[0]?.count ?? 0);

  // Barres ventes mensuelles
  const salesMap = new Map<number, number>();
  for (const r of ventesParMoisRaw as any[]) {
    salesMap.set(Number(r.mois), Number(r.ca));
  }
  const maxCa = Math.max(...Array.from(salesMap.values()), 1);
  const monthlySales = MOIS_LETTRES.map((letter, i) => {
    const ca = salesMap.get(i + 1) ?? 0;
    return {
      month: letter,
      height: ca > 0 ? Math.max(Math.round((ca / maxCa) * 150), 8) : 8,
      current: i + 1 === moisActuel,
    };
  });

  // Revenus par catégorie
  const totalRevenu = (revenusCategoriesRaw as any[]).reduce((s, r) => s + Number(r.montant), 0);
  const revenueSegments = (revenusCategoriesRaw as any[]).map((r, i) => ({
    label: String(r.categorie),
    amount: Number(r.montant),
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  // Alertes combinées
  type AlertItem = { name: string; detail: string; type: string; accent: string; bg: string };
  const alertItems: AlertItem[] = [
    ...(alertesStockFaible as any[]).map((m) => ({
      name: m.denomination as string,
      detail: `Reste : ${m.stock_actuel} unités`,
      type: "Stock faible",
      accent: "#EF9F27",
      bg: "#fff3e2",
    })),
    ...lotsExpirants.map((l) => {
      const jours = Math.ceil((new Date(l.dateExpiration).getTime() - now.getTime()) / 86400000);
      return {
        name: l.medicament.denomination,
        detail: `Exp : ${new Date(l.dateExpiration).toLocaleDateString("fr-FR")}`,
        type: jours <= 30 ? "Urgent" : "Expiration",
        accent: jours <= 30 ? "#E24B4A" : "#EF9F27",
        bg: jours <= 30 ? "#fdedec" : "#fff3e2",
      };
    }),
  ].slice(0, 5);

  // KPI cards
  const kpiCards: KpiMeta[] = [
    {
      Icon: FiPackage, iconBg: "#e6f5f0", iconColor: "#0F6E56",
      value: nbMedicaments.toLocaleString("fr-FR"),
      label: "Médicaments",
      trend: `${nbMedicaments} références actives`,
      valueColor: "#1a1e2a",
    },
    {
      Icon: FiTrendingUp, iconBg: "#e8f8f3", iconColor: "#5DCAA5",
      value: `${caJour.toLocaleString("fr-FR")} Ar`,
      label: "Total Ventes",
      trend: `${ventesJour._count} vente${ventesJour._count !== 1 ? "s" : ""} aujourd'hui`,
      valueColor: "#1a1e2a",
    },
    {
      Icon: FiTruck, iconBg: "#f0eafd", iconColor: "#8c4ee9",
      value: String(nbFournisseurs),
      label: "Fournisseurs",
      trend: "Fournisseurs actifs",
      valueColor: "#1a1e2a",
    },
    {
      Icon: FiClock, iconBg: "#fff3e0", iconColor: "#EF9F27",
      value: String(nbAlertesExpiration),
      label: "Alertes Expir.",
      trend: "Lots expirant dans 90j",
      valueColor: "#EF9F27",
    },
    {
      Icon: FiAlertTriangle, iconBg: "#fdedec", iconColor: "#E24B4A",
      value: String(nbStockFaible),
      label: "Stock Faible",
      trend: "< seuil minimum",
      valueColor: "#E24B4A",
    },
  ];

  // Ventes récentes
  const recentSalesData = ventesRecentes.map((v) => ({
    id: v.numeroVente.slice(-3),
    medicament: v.lignesVente[0]?.medicament.denomination ?? "Multiple articles",
    qty: v.lignesVente.reduce((s, l) => s + l.quantite, 0),
    amount: `${Number(v.montantTotal).toLocaleString("fr-FR")} Ar`,
    time: v.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    status: v.statut,
  }));

  const nomMois = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.Icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_4px_16px_0px_rgba(15,26,61,0.07)] p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: kpi.iconBg }}
                >
                  <Icon size={20} color={kpi.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[20px] leading-tight truncate" style={{ color: kpi.valueColor }}>
                    {kpi.value}
                  </p>
                  <p className="text-[10px] text-[#737e94]">{kpi.label}</p>
                </div>
              </div>
              <p className="text-[10px] text-[#737e94]">{kpi.trend}</p>
            </div>
          );
        })}
      </div>

      {/* Graphiques */}
      <div className="flex gap-4">

        {/* Ventes Mensuelles */}
        <div className="flex-1 bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_4px_16px_0px_rgba(15,26,61,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#1a1e2a] font-semibold text-[13px]">Ventes Mensuelles</h3>
            <span className="text-[#737e94] text-[10px]">{anneeActuelle}</span>
          </div>
          <div className="flex items-end gap-2 h-[160px]">
            {monthlySales.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[5px] transition-all"
                  style={{ height: `${bar.height}px`, backgroundColor: bar.current ? "#0F6E56" : "#a8d8c6" }}
                />
                <span className="text-[9px] text-[#737e94]">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenu Mensuel */}
        <div className="w-[440px] bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_4px_16px_0px_rgba(15,26,61,0.07)] p-5">
          <h3 className="text-[#1a1e2a] font-semibold text-[13px] mb-5">
            Revenu Mensuel — {nomMois.charAt(0).toUpperCase() + nomMois.slice(1)}
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-[130px] h-[130px] shrink-0 rounded-full bg-[#e6f5f0] flex items-center justify-center">
              <div className="w-[86px] h-[86px] rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-[#0F6E56] font-bold text-[13px] leading-tight">
                  {totalRevenu >= 1000000
                    ? `${(totalRevenu / 1000000).toFixed(1)}M`
                    : totalRevenu >= 1000
                    ? `${Math.round(totalRevenu / 1000)}k`
                    : totalRevenu > 0
                    ? String(Math.round(totalRevenu))
                    : "0"}
                </span>
                <span className="text-[#737e94] text-[9px]">Ariary</span>
              </div>
            </div>
            <div className="space-y-4">
              {revenueSegments.length > 0 ? (
                revenueSegments.map((seg) => (
                  <div key={seg.label}>
                    <p className="text-[11px]" style={{ color: seg.color }}>● {seg.label}</p>
                    <p className="text-[#1a1e2a] font-bold text-[14px]">{seg.amount.toLocaleString("fr-FR")} Ar</p>
                  </div>
                ))
              ) : (
                <p className="text-[#737e94] text-[11px]">Aucune vente ce mois</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau + Alertes */}
      <div className="flex gap-4">

        {/* Ventes Récentes */}
        <div className="flex-1 bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_4px_16px_0px_rgba(15,26,61,0.07)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1a1e2a] font-semibold text-[13px]">Ventes Récentes</h3>
            <Link href="/historique" className="text-[#0F6E56] text-[11px] hover:underline">Voir tout →</Link>
          </div>
          {recentSalesData.length === 0 ? (
            <p className="text-[#737e94] text-[12px] py-6 text-center">Aucune vente enregistrée</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#f6f7fa]">
                  {["N°", "Médicament", "Qté", "Montant", "Heure", "Statut"].map((h) => (
                    <th key={h} className="text-left text-[#737e94] font-semibold text-[10px] px-2 py-2 first:pl-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSalesData.map((sale, i) => {
                  const st = statusConfig[sale.status] ?? statusConfig.complete;
                  return (
                    <tr key={sale.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fafcfe]"}>
                      <td className="text-[#737e94] text-[11px] px-2 py-3 pl-3">{sale.id}</td>
                      <td className="text-[#1a1e2a] font-semibold text-[11px] px-2 py-3">{sale.medicament}</td>
                      <td className="text-[#737e94] text-[11px] px-2 py-3">{sale.qty}</td>
                      <td className="text-[#737e94] text-[11px] px-2 py-3">{sale.amount}</td>
                      <td className="text-[#737e94] text-[11px] px-2 py-3">{sale.time}</td>
                      <td className="px-2 py-3">
                        <span className="px-2 py-1 rounded-[6px] text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Alertes Stock & Expiration */}
        <div className="w-[440px] bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_4px_16px_0px_rgba(15,26,61,0.07)] p-5">
          <h3 className="text-[#1a1e2a] font-semibold text-[13px] mb-3">Alertes Stock &amp; Expiration</h3>
          {alertItems.length === 0 ? (
            <p className="text-[#5DCAA5] text-[12px] py-6 text-center">✓ Aucune alerte active</p>
          ) : (
            <div className="space-y-2">
              {alertItems.map((alert, i) => (
                <div key={i} className="flex items-stretch gap-2">
                  <div className="w-1 rounded-[2px] shrink-0" style={{ backgroundColor: alert.accent }} />
                  <div className="flex-1 flex items-center justify-between rounded-[7px] px-3 py-2" style={{ backgroundColor: alert.bg }}>
                    <div>
                      <p className="text-[#1a1e2a] font-semibold text-[11px]">{alert.name}</p>
                      <p className="text-[9px]" style={{ color: alert.accent }}>{alert.detail}</p>
                    </div>
                    <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: alert.accent }}>{alert.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
