"use client";

import { useState, useMemo, useTransition } from "react";
import { FiSearch, FiEye, FiCheckCircle, FiXCircle, FiRefreshCw, FiPrinter } from "react-icons/fi";
import type { Vente, Utilisateur, LigneVente, Medicament } from "@prisma/client";
import { openTicket } from "../../ventes/_components/ticketUtils";
import { useToast } from "@/app/_components/Toast";
import { useRouter } from "next/navigation";
import Pagination from "@/app/_components/Pagination";

const PAGE_SIZE = 9;

type VenteWithRelations = Vente & {
  utilisateur: Utilisateur;
  lignesVente: (LigneVente & { medicament: Medicament })[];
};

type Props = { ventes: VenteWithRelations[]; isAdmin?: boolean };

const STATUT_CONFIG = {
  complete:    { label: "Complète",    icon: FiCheckCircle, color: "bg-green-100 text-green-700" },
  annulee:     { label: "Annulée",     icon: FiXCircle,     color: "bg-red-100 text-red-700" },
  remboursee:  { label: "Remboursée",  icon: FiRefreshCw,   color: "bg-orange-100 text-orange-700" },
};

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  carte_bancaire: "Carte",
  mobile_money: "Mobile Money",
  virement: "Virement",
};

export default function HistoriqueTable({ ventes, isAdmin = false }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<VenteWithRelations | null>(null);
  const [confirmAction, setConfirmAction] = useState<"annulee" | "remboursee" | null>(null);
  const [motif, setMotif] = useState("");
  const [isChanging, startChanging] = useTransition();

  const filtered = useMemo(() => {
    return ventes.filter((v) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        v.numeroVente.toLowerCase().includes(q) ||
        `${v.utilisateur.prenom} ${v.utilisateur.nom}`.toLowerCase().includes(q);
      const matchStatut = statutFilter === "all" || v.statut === statutFilter;
      return matchSearch && matchStatut;
    });
  }, [ventes, search, statutFilter]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const stats = useMemo(() => ({
    total: ventes.filter((v) => v.statut === "complete").reduce((s, v) => s + Number(v.montantTotal), 0),
    count: ventes.filter((v) => v.statut === "complete").length,
    annulees: ventes.filter((v) => v.statut === "annulee").length,
  }), [ventes]);

  function closeDetail() {
    setSelected(null);
    setConfirmAction(null);
    setMotif("");
  }

  function handleChangeStatut() {
    if (!confirmAction || !selected) return;
    startChanging(async () => {
      try {
        const res = await fetch(`/api/ventes/${selected.id}/statut`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut: confirmAction, motif: motif.trim() || undefined }),
        });
        if (!res.ok) throw new Error();
        const label = confirmAction === "annulee" ? "annulée" : "remboursée";
        toast.success(`Vente ${label} avec succès.`);
        closeDetail();
        router.refresh();
      } catch {
        toast.error("Impossible de modifier le statut de la vente.");
      }
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Ventes complètes</p>
          <p className="text-[26px] font-bold text-primary">{stats.count}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Chiffre d&apos;affaires</p>
          <p className="text-[26px] font-bold text-success">{stats.total.toLocaleString("fr-FR")} Ar</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Ventes annulées</p>
          <p className="text-[26px] font-bold text-danger">{stats.annulees}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[12px] border border-line shadow-sm p-4 flex gap-3">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par n° vente ou caissier…"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-[8px] text-[13px] text-ink focus:outline-none focus:border-primary bg-surface"
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => { setStatutFilter(e.target.value); setPage(1); }}
          className="border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink bg-white focus:outline-none focus:border-primary"
        >
          <option value="all">Tous les statuts</option>
          <option value="complete">Complètes</option>
          <option value="annulee">Annulées</option>
          <option value="remboursee">Remboursées</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-line shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-ink font-semibold text-[15px] mb-1">Aucune vente trouvée</p>
            <p className="text-subtle text-[13px]">
              {ventes.length === 0 ? "Les ventes s'afficheront ici une fois enregistrées." : "Aucun résultat pour ces filtres."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["N° Vente", "Date & Heure", "Caissier", "Articles", "Mode paiement", "Total", "Statut", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-subtle uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((vente) => {
                  const cfg = STATUT_CONFIG[vente.statut];
                  const Icon = cfg.icon;
                  return (
                    <tr key={vente.id} className="border-b border-[#f0f2f5] hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">{vente.numeroVente}</td>
                      <td className="px-4 py-3 text-[13px] text-subtle whitespace-nowrap">
                        {new Date(vente.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink">
                        {vente.utilisateur.prenom} {vente.utilisateur.nom}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-subtle">{vente.lignesVente.length} article{vente.lignesVente.length > 1 ? "s" : ""}</td>
                      <td className="px-4 py-3 text-[13px] text-subtle">{MODE_LABELS[vente.modePaiement] ?? vente.modePaiement}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-ink whitespace-nowrap">
                        {Number(vente.montantTotal).toLocaleString("fr-FR")} Ar
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                          <Icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(vente)}
                          className="p-1.5 rounded-[6px] hover:bg-[#e6f5f0] text-primary transition-colors"
                          title="Voir le détail"
                        >
                          <FiEye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              className="px-4 py-3 border-t border-[#f0f2f5]"
            />
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-vente-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[500px] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <h3 id="detail-vente-title" className="font-bold text-[16px] text-ink">{selected.numeroVente}</h3>
                <p className="text-[12px] text-subtle mt-0.5">
                  {new Date(selected.createdAt).toLocaleString("fr-FR")} · {selected.utilisateur.prenom} {selected.utilisateur.nom}
                </p>
              </div>
              <button type="button" onClick={closeDetail} className="text-subtle hover:text-ink text-[20px] leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-subtle text-left border-b border-line">
                    <th className="pb-2 font-medium">Médicament</th>
                    <th className="pb-2 font-medium text-right">Qté</th>
                    <th className="pb-2 font-medium text-right">P.U.</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lignesVente.map((l) => (
                    <tr key={l.id} className="border-b border-[#f0f2f5]">
                      <td className="py-2 text-ink">{l.medicament.denomination}</td>
                      <td className="py-2 text-right text-subtle">{l.quantite}</td>
                      <td className="py-2 text-right text-subtle whitespace-nowrap">{Number(l.prixUnitaire).toLocaleString("fr-FR")} Ar</td>
                      <td className="py-2 text-right font-semibold text-ink whitespace-nowrap">{Number(l.sousTotal).toLocaleString("fr-FR")} Ar</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-line space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-subtle">Mode de paiement</span>
                <span className="font-medium text-ink">{MODE_LABELS[selected.modePaiement] ?? selected.modePaiement}</span>
              </div>
              <div className="flex justify-between text-[14px] font-bold">
                <span className="text-ink">Total</span>
                <span className="text-primary">{Number(selected.montantTotal).toLocaleString("fr-FR")} Ar</span>
              </div>
              {Number(selected.monnaie) > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-subtle">Monnaie rendue</span>
                  <span className="font-medium text-success">{Number(selected.monnaie).toLocaleString("fr-FR")} Ar</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => openTicket({
                  numeroVente: selected.numeroVente,
                  date: selected.createdAt,
                  caissier: `${selected.utilisateur.prenom} ${selected.utilisateur.nom}`,
                  montantTotal: Number(selected.montantTotal),
                  montantPaye: Number(selected.montantPaye),
                  monnaie: Number(selected.monnaie),
                  modePaiement: selected.modePaiement,
                  lignes: selected.lignesVente.map((l) => ({
                    denomination: l.medicament.denomination,
                    quantite: l.quantite,
                    prixUnitaire: Number(l.prixUnitaire),
                    tauxRemise: Number(l.tauxRemise),
                    sousTotal: Number(l.sousTotal),
                  })),
                })}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border border-[#e0e5ed] rounded-[8px] text-[13px] font-semibold text-[#737e94] hover:bg-[#f6f7fa] transition-colors"
              >
                <FiPrinter size={14} />
                Voir / Imprimer le reçu
              </button>

              {/* Actions admin — uniquement pour les ventes complètes */}
              {isAdmin && selected.statut === "complete" && (
                confirmAction ? (
                  <div className="mt-1 border-t border-line pt-3 space-y-2.5">
                    <p className="text-[13px] font-semibold text-ink">
                      {confirmAction === "annulee" ? "Confirmer l'annulation ?" : "Confirmer le remboursement ?"}
                    </p>
                    {confirmAction === "annulee" && (
                      <p className="text-[12px] text-subtle">Le stock des médicaments sera automatiquement réintégré.</p>
                    )}
                    <textarea
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      placeholder="Motif (optionnel)"
                      rows={2}
                      className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setConfirmAction(null); setMotif(""); }}
                        className="flex-1 px-3 py-2 rounded-[8px] text-[13px] border border-line text-subtle hover:bg-surface transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleChangeStatut}
                        disabled={isChanging}
                        className={`flex-1 px-3 py-2 rounded-[8px] text-[13px] font-semibold text-white disabled:opacity-50 transition-colors ${
                          confirmAction === "annulee"
                            ? "bg-[#E24B4A] hover:bg-red-700"
                            : "bg-[#EF9F27] hover:bg-amber-600"
                        }`}
                      >
                        {isChanging ? "En cours…" : "Confirmer"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-2 border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmAction("remboursee")}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold border border-[#EF9F27] text-[#EF9F27] hover:bg-orange-50 transition-colors"
                    >
                      <FiRefreshCw size={13} /> Rembourser
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction("annulee")}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold bg-[#E24B4A] hover:bg-red-700 text-white transition-colors"
                    >
                      <FiXCircle size={13} /> Annuler la vente
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
