"use client";

import { useState, useMemo, useTransition } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiPackage, FiAlertTriangle, FiCheckCircle, FiFilter } from "react-icons/fi";
import type { Medicament, Categorie, Fournisseur } from "@prisma/client";
import { deleteMedicament } from "../actions";
import MedicamentModal from "./MedicamentModal";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { useToast } from "@/app/_components/Toast";
import Pagination from "@/app/_components/Pagination";

const PAGE_SIZE = 7;

type MedWithRelations = Medicament & {
  categorie: Categorie | null;
  fournisseur: Fournisseur | null;
};

type Props = {
  medicaments: MedWithRelations[];
  categories: Categorie[];
  fournisseurs: Fournisseur[];
  initialSearch?: string;
};

function getStockStatus(med: Medicament) {
  if (med.stockActuel === 0) return "epuise";
  if (med.stockActuel <= med.stockMinimum) return "critique";
  if (med.stockActuel <= med.stockMinimum * 2) return "faible";
  return "normal";
}

const STATUS_LABELS = { epuise: "Épuisé", critique: "Critique", faible: "Faible", normal: "Normal" };
const STATUS_COLORS = {
  epuise: "bg-red-100 text-red-700",
  critique: "bg-red-100 text-red-700",
  faible: "bg-orange-100 text-orange-700",
  normal: "bg-green-100 text-green-700",
};

export default function StockTable({ medicaments, categories, fournisseurs, initialSearch = "" }: Props) {
  const toast = useToast();
  const [search, setSearch] = useState(initialSearch);
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<MedWithRelations | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<MedWithRelations | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return medicaments.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.denomination.toLowerCase().includes(q) ||
        (m.dci ?? "").toLowerCase().includes(q) ||
        (m.codeBarres ?? "").toLowerCase().includes(q);
      const matchCat = catFilter === "all" || m.categorieId === catFilter;
      const status = getStockStatus(m);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "alerte" && (status === "critique" || status === "epuise")) ||
        status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [medicaments, search, catFilter, statusFilter]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const stats = useMemo(() => ({
    total: medicaments.length,
    critiques: medicaments.filter((m) => getStockStatus(m) === "critique" || getStockStatus(m) === "epuise").length,
    faibles: medicaments.filter((m) => getStockStatus(m) === "faible").length,
    valeur: medicaments.reduce((s, m) => s + Number(m.prixAchat) * m.stockActuel, 0),
  }), [medicaments]);

  function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.denomination;
    startTransition(async () => {
      try {
        await deleteMedicament(deleteTarget.id);
        setDeleteTarget(null);
        toast.success(`"${name}" supprimé avec succès.`);
      } catch {
        toast.error("Erreur lors de la suppression.");
      }
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] p-4">
          <p className="text-[12px] text-[#737e94] mb-1">Total médicaments</p>
          <p className="text-[26px] font-bold text-[#0F6E56]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] p-4">
          <p className="text-[12px] text-[#737e94] mb-1">Stock critique / épuisé</p>
          <p className="text-[26px] font-bold text-[#E24B4A]">{stats.critiques}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] p-4">
          <p className="text-[12px] text-[#737e94] mb-1">Stock faible</p>
          <p className="text-[26px] font-bold text-[#EF9F27]">{stats.faibles}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] p-4">
          <p className="text-[12px] text-[#737e94] mb-1">Valeur stock (Ar)</p>
          <p className="text-[26px] font-bold text-[#5DCAA5]">{stats.valeur.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, principe actif, code-barres…"
            className="w-full pl-9 pr-3 py-2 border border-[#e0e5ed] rounded-[8px] text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-[#f6f7fa]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[#737e94]">
          <FiFilter size={14} />
          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
            className="border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] bg-white focus:outline-none focus:border-[#0F6E56]"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] bg-white focus:outline-none focus:border-[#0F6E56]"
        >
          <option value="all">Tous les statuts</option>
          <option value="normal">Normal</option>
          <option value="faible">Faible</option>
          <option value="alerte">Critique / Épuisé</option>
        </select>
        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#0F6E56] hover:bg-[#0a5a45] text-white rounded-[8px] text-[13px] font-semibold transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-[#f6f7fa] rounded-[14px] flex items-center justify-center mb-3 border border-[#e0e5ed]">
              <FiPackage size={24} className="text-[#737e94]" />
            </div>
            <p className="text-[#1a1e2a] font-semibold text-[15px] mb-1">Aucun médicament trouvé</p>
            <p className="text-[#737e94] text-[13px]">
              {medicaments.length === 0
                ? "Commencez par ajouter des médicaments à votre stock."
                : "Aucun résultat pour ces filtres."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e0e5ed] bg-[#f6f7fa]">
                  {["Médicament", "Catégorie", "Présentation / Dose", "Prix vente", "Stock actuel", "Stock min", "Statut", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#737e94] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((med, i) => {
                  const status = getStockStatus(med);
                  return (
                    <tr
                      key={med.id}
                      className={`border-b border-[#f0f2f5] hover:bg-[#fafbfc] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafbfe]"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-[#1a1e2a] leading-tight">{med.denomination}</span>
                          {med.dci && <span className="text-[11px] text-[#737e94]">{med.dci}</span>}
                          {med.prescriptionRequise && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#8c4ee9] font-medium">
                              <FiAlertTriangle size={10} /> Ordonnance
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#737e94]">
                        {med.categorie?.nom ?? <span className="italic text-[#b0b8c9]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#737e94]">
                        {[med.forme, med.dosage].filter(Boolean).join(" · ") || <span className="italic text-[#b0b8c9]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1a1e2a] whitespace-nowrap">
                        {Number(med.prixVente).toLocaleString("fr-FR")} Ar
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-bold ${status === "critique" || status === "epuise" ? "text-[#E24B4A]" : status === "faible" ? "text-[#EF9F27]" : "text-[#1a1e2a]"}`}>
                          {med.stockActuel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#737e94]">{med.stockMinimum}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
                          {status === "normal" ? <FiCheckCircle size={11} /> : <FiAlertTriangle size={11} />}
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(med)}
                            className="p-1.5 rounded-[6px] hover:bg-[#e6f5f0] text-[#0F6E56] transition-colors"
                            title="Modifier"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(med)}
                            className="p-1.5 rounded-[6px] hover:bg-red-50 text-[#E24B4A] transition-colors"
                            title="Supprimer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
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

      {/* Modal Add/Edit */}
      {editTarget !== null && (
        <MedicamentModal
          medicament={editTarget === "new" ? null : editTarget}
          categories={categories}
          fournisseurs={fournisseurs}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            toast.success(editTarget === "new" ? "Médicament ajouté avec succès." : "Médicament mis à jour.");
          }}
        />
      )}

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmModal
          title="Supprimer ce médicament ?"
          message={
            <>
              La fiche de <strong className="text-[#1a1e2a]">{deleteTarget.denomination}</strong> sera supprimée définitivement de votre stock.
            </>
          }
          confirmLabel="Supprimer"
          isPending={isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
