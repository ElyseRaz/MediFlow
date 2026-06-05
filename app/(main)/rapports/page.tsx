"use client";

import { useState, useCallback } from "react";
import {
  FiBarChart2,
  FiPackage,
  FiAlertTriangle,
  FiDownload,
  FiTrendingUp,
  FiRefreshCw,
  FiShoppingCart,
  FiClock,
} from "react-icons/fi";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "ventes" | "stock" | "lots" | "export";

type VentesData = {
  periode: { debut: string; fin: string };
  nb_ventes: number;
  ca_total: number;
  marge_brute: number;
  panier_moyen: number;
  repartition_paiement: { mode: string; montant: number }[];
  top_medicaments: { denomination: string; total_vendu: number; ca: number }[];
};

type StockMed = {
  id: string;
  denomination: string;
  categorie: string;
  fournisseur: string;
  stock_actuel: number;
  stock_minimum: number;
  prix_vente: number;
  valeur_stock: number;
  statut_stock: "rupture" | "faible" | "ok";
};

type StockData = {
  valeur_totale_stock: number;
  nb_medicaments_actifs: number;
  nb_ruptures: number;
  nb_stock_faible: number;
  medicaments: StockMed[];
};

type Lot = {
  id: string;
  numero_lot: string;
  denomination: string;
  categorie: string;
  date_expiration: string;
  jours_restants: number;
  quantite: number;
  valeur_risque: number;
  urgent: boolean;
  expire: boolean;
};

type LotsData = {
  nb_lots: number;
  valeur_totale_exposee: number;
  nb_lots_critiques: number;
  nb_lots_expires: number;
  lots: Lot[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} Ar`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-5 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
      <p className="text-[#737e94] text-[11px] font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-[22px] font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[#737e94] text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Tab Ventes ────────────────────────────────────────────────────────────────

function TabVentes() {
  const [debut, setDebut] = useState(firstOfMonth());
  const [fin, setFin] = useState(today());
  const [data, setData] = useState<VentesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/rapports/ventes?date_debut=${debut}&date_fin=${fin}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setErr("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, [debut, fin]);

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-4 flex flex-wrap gap-3 items-end shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div>
          <label className="block text-[11px] font-medium text-[#737e94] mb-1">Du</label>
          <input
            type="date"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="h-9 rounded-[8px] border border-[#e0e5ed] px-3 text-[12px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#737e94] mb-1">Au</label>
          <input
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="h-9 rounded-[8px] border border-[#e0e5ed] px-3 text-[12px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56]"
          />
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-9 px-5 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Générer
        </button>
      </div>

      {err && <p className="text-[#E24B4A] text-[13px]">{err}</p>}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Chiffre d'affaires" value={fmt(data.ca_total)} color="text-[#0F6E56]" />
            <KpiCard label="Bénéfice brut" value={fmt(data.marge_brute)} sub={`${data.ca_total > 0 ? Math.round((data.marge_brute / data.ca_total) * 100) : 0}% du total`} color="text-[#5DCAA5]" />
            <KpiCard label="Nombre de ventes" value={data.nb_ventes.toString()} color="text-[#1a1e2a]" />
            <KpiCard label="Achat moyen par vente" value={fmt(data.panier_moyen)} color="text-[#EF9F27]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Répartition paiement */}
            <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-5 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
              <h3 className="text-[#1a1e2a] font-semibold text-[14px] mb-4">Répartition par mode de paiement</h3>
              {data.repartition_paiement.length === 0 ? (
                <p className="text-[#737e94] text-[13px]">Aucune vente sur cette période.</p>
              ) : (
                <div className="space-y-3">
                  {data.repartition_paiement
                    .sort((a, b) => b.montant - a.montant)
                    .map((p) => {
                      const pct = data.ca_total > 0 ? (p.montant / data.ca_total) * 100 : 0;
                      return (
                        <div key={p.mode}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[#1a1e2a] text-[12px] font-medium capitalize">{p.mode}</span>
                            <span className="text-[#737e94] text-[11px]">{fmt(p.montant)} — {Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 bg-[#f6f7fa] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0F6E56] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top médicaments */}
            <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-5 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
              <h3 className="text-[#1a1e2a] font-semibold text-[14px] mb-4">Top médicaments vendus</h3>
              {data.top_medicaments.length === 0 ? (
                <p className="text-[#737e94] text-[13px]">Aucune vente sur cette période.</p>
              ) : (
                <div className="space-y-2">
                  {data.top_medicaments.slice(0, 8).map((m, i) => (
                    <div key={m.denomination} className="flex items-center gap-3">
                      <span className="w-5 text-[11px] font-bold text-[#737e94] shrink-0">{i + 1}</span>
                      <span className="flex-1 text-[12px] text-[#1a1e2a] truncate">{m.denomination}</span>
                      <span className="text-[11px] text-[#737e94] shrink-0">{m.total_vendu} unités</span>
                      <span className="text-[11px] font-semibold text-[#0F6E56] shrink-0 w-[90px] text-right">{fmt(m.ca)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-12 flex flex-col items-center text-center shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
          <FiTrendingUp size={36} className="text-[#d0d6e0] mb-3" />
          <p className="text-[#737e94] text-[13px]">Sélectionnez une période et cliquez sur <strong>Générer</strong></p>
        </div>
      )}
    </div>
  );
}

// ── Tab Stock ─────────────────────────────────────────────────────────────────

function TabStock() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"tous" | "rupture" | "faible">("tous");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/rapports/stock");
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setErr("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, []);

  const meds = data?.medicaments
    .filter((m) => filter === "tous" || m.statut_stock === filter)
    .filter((m) => !search || m.denomination.toLowerCase().includes(search.toLowerCase())) ?? [];

  const statutBadge = (s: StockMed["statut_stock"]) => {
    if (s === "rupture") return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fdedec] text-[#E24B4A] text-[10px] font-semibold">Rupture</span>;
    if (s === "faible")  return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fef3e2] text-[#EF9F27] text-[10px] font-semibold">Faible</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#e8f8f3] text-[#5DCAA5] text-[10px] font-semibold">OK</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-9 px-5 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Charger le rapport
        </button>
      </div>

      {err && <p className="text-[#E24B4A] text-[13px]">{err}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Valeur totale stock" value={fmt(data.valeur_totale_stock)} color="text-[#0F6E56]" />
            <KpiCard label="Médicaments actifs" value={data.nb_medicaments_actifs.toString()} color="text-[#1a1e2a]" />
            <KpiCard label="Ruptures de stock" value={data.nb_ruptures.toString()} color="text-[#E24B4A]" />
            <KpiCard label="Stock faible" value={data.nb_stock_faible.toString()} color="text-[#EF9F27]" />
          </div>

          <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
            <div className="flex flex-wrap gap-3 items-center p-4 border-b border-[#e0e5ed]">
              <div className="flex items-center gap-2 bg-[#f6f7fa] rounded-[8px] px-3 h-9 flex-1 min-w-[180px]">
                <FiPackage size={13} className="text-[#737e94] shrink-0" />
                <input
                  type="search"
                  placeholder="Rechercher un médicament…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-[12px] text-[#1a1e2a] outline-none w-full placeholder:text-[#737e94]"
                />
              </div>
              {(["tous", "rupture", "faible"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-9 px-4 rounded-[8px] text-[12px] font-medium capitalize transition-colors ${filter === f ? "bg-[#0F6E56] text-white" : "bg-[#f6f7fa] text-[#737e94] hover:bg-[#e6f5f0]"}`}
                >
                  {f === "tous" ? "Tous" : f === "rupture" ? "Ruptures" : "Stock faible"}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#e0e5ed] bg-[#f9fafb]">
                    {["Médicament", "Catégorie", "Fournisseur", "Stock actuel", "Stock min.", "Prix vente", "Valeur stock", "Statut"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#737e94] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meds.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#737e94]">Aucun résultat.</td></tr>
                  ) : meds.map((m) => (
                    <tr key={m.id} className="border-b border-[#f0f2f5] hover:bg-[#fafbfc]">
                      <td className="px-4 py-3 font-medium text-[#1a1e2a]">{m.denomination}</td>
                      <td className="px-4 py-3 text-[#737e94]">{m.categorie}</td>
                      <td className="px-4 py-3 text-[#737e94]">{m.fournisseur}</td>
                      <td className="px-4 py-3 font-semibold text-[#1a1e2a]">{m.stock_actuel}</td>
                      <td className="px-4 py-3 text-[#737e94]">{m.stock_minimum}</td>
                      <td className="px-4 py-3 text-[#737e94]">{fmt(m.prix_vente)}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F6E56]">{fmt(m.valeur_stock)}</td>
                      <td className="px-4 py-3">{statutBadge(m.statut_stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#e0e5ed] text-[11px] text-[#737e94]">
              {meds.length} résultat{meds.length !== 1 ? "s" : ""}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-12 flex flex-col items-center text-center shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
          <FiPackage size={36} className="text-[#d0d6e0] mb-3" />
          <p className="text-[#737e94] text-[13px]">Cliquez sur <strong>Charger le rapport</strong> pour afficher l&apos;état du stock.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab Lots expiration ────────────────────────────────────────────────────────

function TabLots() {
  const [jours, setJours] = useState(90);
  const [data, setData] = useState<LotsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/rapports/lots-expiration?jours=${jours}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setErr("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, [jours]);

  const rowBg = (l: Lot) => {
    if (l.expire) return "bg-[#fdedec]";
    if (l.urgent) return "bg-[#fef3e2]";
    return "";
  };

  const badge = (l: Lot) => {
    if (l.expire) return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fdedec] text-[#E24B4A] text-[10px] font-semibold">Expiré</span>;
    if (l.urgent) return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fef3e2] text-[#EF9F27] text-[10px] font-semibold">Urgent ({"<"} 30j)</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#0F6E56] text-[10px] font-semibold">Attention</span>;
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-4 flex flex-wrap gap-3 items-end shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div>
          <label className="block text-[11px] font-medium text-[#737e94] mb-1">Période à surveiller (jours)</label>
          <select
            value={jours}
            onChange={(e) => setJours(Number(e.target.value))}
            className="h-9 rounded-[8px] border border-[#e0e5ed] px-3 text-[12px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-white"
          >
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
            <option value={90}>90 jours</option>
            <option value={180}>6 mois</option>
            <option value={365}>1 an</option>
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-9 px-5 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Analyser
        </button>
      </div>

      {err && <p className="text-[#E24B4A] text-[13px]">{err}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Lots concernés" value={data.nb_lots.toString()} color="text-[#1a1e2a]" />
            <KpiCard label="Valeur à risque" value={fmt(data.valeur_totale_exposee)} color="text-[#EF9F27]" />
            <KpiCard label="Lots urgents (< 30j)" value={data.nb_lots_critiques.toString()} color="text-[#EF9F27]" />
            <KpiCard label="Lots expirés" value={data.nb_lots_expires.toString()} color="text-[#E24B4A]" />
          </div>

          <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#e0e5ed] bg-[#f9fafb]">
                    {["N° Lot", "Médicament", "Catégorie", "Expiration", "Jours restants", "Quantité", "Valeur à risque", "Statut"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#737e94] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lots.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#737e94]">Aucun lot expirant dans cet horizon.</td></tr>
                  ) : data.lots.map((l) => (
                    <tr key={l.id} className={`border-b border-[#f0f2f5] ${rowBg(l)}`}>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#737e94]">{l.numero_lot}</td>
                      <td className="px-4 py-3 font-medium text-[#1a1e2a]">{l.denomination}</td>
                      <td className="px-4 py-3 text-[#737e94]">{l.categorie}</td>
                      <td className="px-4 py-3 text-[#737e94]">{new Date(l.date_expiration).toLocaleDateString("fr-FR")}</td>
                      <td className={`px-4 py-3 font-bold ${l.expire ? "text-[#E24B4A]" : l.urgent ? "text-[#EF9F27]" : "text-[#0F6E56]"}`}>
                        {l.expire ? "Expiré" : `${l.jours_restants}j`}
                      </td>
                      <td className="px-4 py-3 text-[#1a1e2a]">{l.quantite}</td>
                      <td className="px-4 py-3 font-semibold text-[#EF9F27]">{fmt(l.valeur_risque)}</td>
                      <td className="px-4 py-3">{badge(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-12 flex flex-col items-center text-center shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
          <FiClock size={36} className="text-[#d0d6e0] mb-3" />
          <p className="text-[#737e94] text-[13px]">Sélectionnez un horizon et cliquez sur <strong>Analyser</strong>.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab Export ────────────────────────────────────────────────────────────────

type ExportState = Record<string, "idle" | "loading" | "done" | "error">;

function TabExport() {
  const [states, setStates] = useState<ExportState>({ stock: "idle", ventes: "idle", commandes: "idle" });

  async function download(type: string, filename: string) {
    setStates((s) => ({ ...s, [type]: "loading" }));
    try {
      const r = await fetch(`/api/rapports/export/csv?type=${type}`);
      if (!r.ok) {
        setStates((s) => ({ ...s, [type]: "error" }));
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStates((s) => ({ ...s, [type]: "done" }));
      setTimeout(() => setStates((s) => ({ ...s, [type]: "idle" })), 3000);
    } catch {
      setStates((s) => ({ ...s, [type]: "error" }));
    }
  }

  const exports = [
    {
      type: "stock",
      label: "État du stock",
      desc: "Tous les médicaments avec prix, quantités et statut",
      filename: "stock.csv",
      icon: FiPackage,
      color: "#0F6E56",
      bg: "#e6f5f0",
    },
    {
      type: "ventes",
      label: "Historique des ventes",
      desc: "Les 5 000 dernières ventes avec détails et montants",
      filename: "ventes.csv",
      icon: FiShoppingCart,
      color: "#5DCAA5",
      bg: "#e8f8f3",
    },
    {
      type: "commandes",
      label: "Commandes fournisseurs",
      desc: "Historique des commandes et bons de commande",
      filename: "commandes.csv",
      icon: FiBarChart2,
      color: "#8b5cf6",
      bg: "#f5f3ff",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[#737e94] text-[13px]">Téléchargez les données en format CSV. Réservé aux administrateurs.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map(({ type, label, desc, filename, icon: Icon, color, bg }) => {
          const state = states[type];
          return (
            <div key={type} className="bg-white rounded-[12px] border border-[#e0e5ed] p-5 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
              <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-4" style={{ backgroundColor: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="text-[#1a1e2a] font-semibold text-[14px] mb-1">{label}</h3>
              <p className="text-[#737e94] text-[12px] mb-4">{desc}</p>
              <button
                type="button"
                onClick={() => download(type, filename)}
                disabled={state === "loading"}
                className="w-full h-9 rounded-[8px] text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ backgroundColor: state === "done" ? "#5DCAA5" : color, color: "#fff" }}
              >
                {state === "loading" ? (
                  <><FiRefreshCw size={13} className="animate-spin" /> Génération…</>
                ) : state === "done" ? (
                  "Téléchargé ✓"
                ) : state === "error" ? (
                  "Erreur — Réessayer"
                ) : (
                  <><FiDownload size={13} /> Télécharger CSV</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "ventes",  label: "Ventes",          icon: FiTrendingUp },
  { id: "stock",   label: "État du stock",   icon: FiPackage },
  { id: "lots",    label: "Péremptions",      icon: FiClock },
  { id: "export",  label: "Export CSV",      icon: FiDownload },
];

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ventes");

  return (
    <div className="space-y-5">

      {/* Onglets */}
      <div className="flex gap-1 bg-white rounded-[12px] border border-[#e0e5ed] p-1 w-fit shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-medium transition-all ${
              activeTab === id
                ? "bg-[#0F6E56] text-white shadow-sm"
                : "text-[#737e94] hover:text-[#1a1e2a] hover:bg-[#f6f7fa]"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "ventes" && <TabVentes />}
      {activeTab === "stock"  && <TabStock />}
      {activeTab === "lots"   && <TabLots />}
      {activeTab === "export" && <TabExport />}
    </div>
  );
}
