"use client";

import { useState, useMemo, useTransition } from "react";
import {
  FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle, FiXCircle,
  FiTruck, FiAlertCircle, FiEye, FiSearch
} from "react-icons/fi";
import type { CommandeFournisseur, Fournisseur, Utilisateur, LigneCommande, Medicament } from "@prisma/client";
import { createCommande, recevoirCommande, updateCommandeStatut, type LigneCommandeInput } from "../actions";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { useToast } from "@/app/_components/Toast";
import Pagination from "@/app/_components/Pagination";

const PAGE_SIZE = 9;

type CommandeWithRelations = CommandeFournisseur & {
  fournisseur: Fournisseur;
  utilisateur: Utilisateur;
  lignesCommande: (LigneCommande & { medicament: Medicament })[];
};

type Props = {
  commandes: CommandeWithRelations[];
  fournisseurs: Fournisseur[];
  medicaments: Medicament[];
  pharmacieId: string;
  utilisateurId: string;
};

const STATUT_CONFIG = {
  brouillon:       { label: "Brouillon",       color: "bg-gray-100 text-gray-600" },
  envoyee:         { label: "Envoyée",          color: "bg-blue-100 text-blue-700" },
  recue_partielle: { label: "Reçue partielle",  color: "bg-orange-100 text-orange-700" },
  recue_complete:  { label: "Reçue",            color: "bg-green-100 text-green-700" },
  annulee:         { label: "Annulée",          color: "bg-red-100 text-red-700" },
};

type CartLigne = { medicament: Medicament; quantite: number; prixUnitaire: number };

function NouvelleCommandeModal({
  fournisseurs,
  medicaments,
  pharmacieId,
  utilisateurId,
  onClose,
  onSuccess,
}: Pick<Props, "fournisseurs" | "medicaments" | "pharmacieId" | "utilisateurId"> & {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fournisseurId, setFournisseurId] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [lignes, setLignes] = useState<CartLigne[]>([]);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  const filteredMeds = useMemo(() => {
    if (!search.trim()) return medicaments.slice(0, 20);
    const q = search.toLowerCase();
    return medicaments.filter(
      (m) => m.denomination.toLowerCase().includes(q) || (m.dci ?? "").toLowerCase().includes(q)
    );
  }, [medicaments, search]);

  function addLigne(med: Medicament) {
    setFieldErrors((prev) => { const n = { ...prev }; delete n.lignes; return n; });
    setLignes((prev) => {
      const existing = prev.find((l) => l.medicament.id === med.id);
      if (existing) {
        const newQty = existing.quantite + 1;
        setQtyInputs((q) => ({ ...q, [med.id]: String(newQty) }));
        return prev.map((l) => l.medicament.id === med.id ? { ...l, quantite: newQty } : l);
      }
      setQtyInputs((q) => ({ ...q, [med.id]: "1" }));
      return [...prev, { medicament: med, quantite: 1, prixUnitaire: Number(med.prixAchat) }];
    });
  }

  function commitQty(id: string) {
    const raw = qtyInputs[id] ?? "";
    const qty = Math.max(1, parseInt(raw) || 1);
    setQtyInputs((q) => ({ ...q, [id]: String(qty) }));
    setLignes((prev) => prev.map((l) => l.medicament.id === id ? { ...l, quantite: qty } : l));
  }

  function removeLigne(id: string) {
    setLignes((prev) => prev.filter((l) => l.medicament.id !== id));
    setQtyInputs((q) => { const n = { ...q }; delete n[id]; return n; });
  }

  function updatePrix(id: string, value: string) {
    setLignes((prev) =>
      prev.map((l) => l.medicament.id === id ? { ...l, prixUnitaire: parseFloat(value) || 0 } : l)
    );
  }

  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const isValid = fournisseurId !== "" && lignes.length > 0;

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!fournisseurId) e.fournisseurId = "Veuillez sélectionner un fournisseur.";
    if (lignes.length === 0) e.lignes = "Ajoutez au moins un médicament à la commande.";
    if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setServerError("");
    setFieldErrors({});
    startTransition(async () => {
      try {
        const data: LigneCommandeInput[] = lignes.map((l) => ({
          medicamentId: l.medicament.id,
          quantiteCommandee: l.quantite,
          prixUnitaire: l.prixUnitaire,
        }));
        await createCommande({ pharmacieId, fournisseurId, utilisateurId, dateLivraisonPrevue: dateLivraison || undefined, notes, lignes: data });
        onSuccess?.();
      } catch {
        setServerError("Une erreur est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[760px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-bold text-[17px] text-ink">Nouvelle commande fournisseur</h3>
          <button type="button" onClick={onClose} className="text-subtle hover:text-ink text-[22px] leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-4 py-3 text-[13px]">
              <FiAlertCircle size={15} /> {serverError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Fournisseur *</label>
              <select
                value={fournisseurId}
                onChange={(e) => {
                  setFournisseurId(e.target.value);
                  setFieldErrors((prev) => { const n = { ...prev }; delete n.fournisseurId; return n; });
                }}
                className={`w-full border rounded-[8px] px-3 py-2 text-[13px] text-ink bg-white focus:outline-none focus:border-primary ${fieldErrors.fournisseurId ? "border-[#E24B4A]" : "border-line"}`}
              >
                <option value="">— Sélectionner —</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
              {fieldErrors.fournisseurId && (
                <p className="mt-1 text-[11px] text-[#E24B4A]">{fieldErrors.fournisseurId}</p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Livraison prévue</label>
              <input
                type="date"
                value={dateLivraison}
                onChange={(e) => setDateLivraison(e.target.value)}
                className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Product search */}
          <div>
            <p className="text-[12px] font-medium text-ink mb-2">Ajouter des médicaments</p>
            <div className="relative mb-3">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un médicament…"
                className="w-full pl-9 pr-3 py-2 border border-line rounded-[8px] text-[13px] text-ink focus:outline-none focus:border-primary bg-surface"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto">
              {filteredMeds.map((med) => (
                <button
                  type="button"
                  key={med.id}
                  onClick={() => addLigne(med)}
                  className="text-left bg-surface border border-line rounded-[8px] px-3 py-2 hover:border-primary transition-colors"
                >
                  <p className="text-[12px] font-semibold text-ink leading-tight truncate">{med.denomination}</p>
                  <p className="text-[11px] text-subtle">{Number(med.prixAchat).toLocaleString("fr-FR")} Ar</p>
                </button>
              ))}
            </div>
            {fieldErrors.lignes && (
              <p className="mt-2 text-[11px] text-[#E24B4A]">{fieldErrors.lignes}</p>
            )}
          </div>

          {/* Lignes de commande */}
          {lignes.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-ink mb-2">Articles commandés</p>
              <div className="border border-line rounded-[8px] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface border-b border-line">
                    <tr>
                      {["Médicament", "Qté", "Prix unitaire (Ar)", "Sous-total", ""].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-subtle">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l) => (
                      <tr key={l.medicament.id} className="border-b border-[#f0f2f5]">
                        <td className="px-3 py-2 text-ink font-medium">{l.medicament.denomination}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={qtyInputs[l.medicament.id] ?? String(l.quantite)}
                            onChange={(e) => setQtyInputs((q) => ({ ...q, [l.medicament.id]: e.target.value }))}
                            onBlur={() => commitQty(l.medicament.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") commitQty(l.medicament.id); }}
                            className="w-16 h-7 text-center border border-line rounded-[6px] text-[13px] font-bold text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.prixUnitaire}
                            onChange={(e) => updatePrix(l.medicament.id, e.target.value)}
                            className="w-24 border border-line rounded-[6px] px-2 py-1 text-[12px] text-ink focus:outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-ink whitespace-nowrap">
                          {(l.quantite * l.prixUnitaire).toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeLigne(l.medicament.id)}
                            className="text-danger hover:bg-red-50 p-1 rounded transition-colors"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-[14px] font-bold text-ink">Total : {total.toLocaleString("fr-FR")} Ar</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary resize-none h-16"
              placeholder="Instructions particulières, références…"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-[8px] text-[13px] font-medium text-subtle border border-line hover:bg-surface transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[8px] text-[13px] font-semibold transition-colors"
          >
            {isPending ? "Création…" : "Créer la commande"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReapproClient({ commandes, fournisseurs, medicaments, pharmacieId, utilisateurId }: Props) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<CommandeWithRelations | null>(null);
  const [confirmAnnuler, setConfirmAnnuler] = useState<CommandeWithRelations | null>(null);
  const [confirmRecevoir, setConfirmRecevoir] = useState<CommandeWithRelations | null>(null);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const paginated = useMemo(
    () => commandes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [commandes, page]
  );

  const stats = useMemo(() => ({
    total: commandes.length,
    enCours: commandes.filter((c) => c.statut === "envoyee" || c.statut === "recue_partielle").length,
    recues: commandes.filter((c) => c.statut === "recue_complete").length,
    montant: commandes.filter((c) => c.statut !== "annulee").reduce((s, c) => s + Number(c.montantTotal), 0),
  }), [commandes]);

  function handleRecevoir(c: CommandeWithRelations) {
    startTransition(async () => {
      try {
        await recevoirCommande(c.id);
        setConfirmRecevoir(null);
        toast.success(`Commande ${c.numeroCommande} marquée comme reçue.`);
      } catch {
        toast.error("Erreur lors de la réception de la commande.");
      }
    });
  }

  function handleAnnuler(c: CommandeWithRelations) {
    startTransition(async () => {
      try {
        await updateCommandeStatut(c.id, "annulee");
        setConfirmAnnuler(null);
        toast.success(`Commande ${c.numeroCommande} annulée.`);
      } catch {
        toast.error("Erreur lors de l'annulation.");
      }
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Total commandes</p>
          <p className="text-[26px] font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">En cours</p>
          <p className="text-[26px] font-bold text-warning">{stats.enCours}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Reçues</p>
          <p className="text-[26px] font-bold text-success">{stats.recues}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Montant total</p>
          <p className="text-[24px] font-bold text-ink">{stats.montant.toLocaleString("fr-FR")} Ar</p>
        </div>
      </div>

      {/* Bouton nouvelle commande */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0a5a45] text-white rounded-[8px] text-[13px] font-semibold transition-colors"
        >
          <FiPlus size={15} /> Nouvelle commande
        </button>
      </div>

      {/* Liste des commandes */}
      <div className="bg-white rounded-[12px] border border-line shadow-sm overflow-hidden">
        {commandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-[#fef3e2] rounded-[14px] flex items-center justify-center mb-3">
              <FiRefreshCw size={24} className="text-warning" />
            </div>
            <p className="font-semibold text-[15px] text-ink mb-1">Aucune commande</p>
            <p className="text-subtle text-[13px]">Créez votre première commande fournisseur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["N° Commande", "Fournisseur", "Date", "Livraison prévue", "Articles", "Montant", "Statut", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-subtle uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const cfg = STATUT_CONFIG[c.statut] ?? { label: c.statut, color: "bg-gray-100 text-gray-600" };
                  const canReceive = c.statut === "envoyee" || c.statut === "recue_partielle";
                  const canCancel = c.statut !== "annulee" && c.statut !== "recue_complete";
                  return (
                    <tr key={c.id} className="border-b border-[#f0f2f5] hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-semibold text-primary">{c.numeroCommande}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{c.fournisseur.nom}</td>
                      <td className="px-4 py-3 text-[13px] text-subtle whitespace-nowrap">
                        {new Date(c.dateCommande).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-subtle whitespace-nowrap">
                        {c.dateLivraisonPrevue ? new Date(c.dateLivraisonPrevue).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-subtle">{c.lignesCommande.length} article{c.lignesCommande.length > 1 ? "s" : ""}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-ink whitespace-nowrap">
                        {Number(c.montantTotal).toLocaleString("fr-FR")} Ar
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelected(c)}
                            className="p-1.5 rounded-[6px] hover:bg-[#e6f5f0] text-primary transition-colors"
                            title="Voir"
                          >
                            <FiEye size={14} />
                          </button>
                          {canReceive && (
                            <button
                              type="button"
                              onClick={() => setConfirmRecevoir(c)}
                              disabled={isPending}
                              className="p-1.5 rounded-[6px] hover:bg-green-50 text-success transition-colors disabled:opacity-50"
                              title="Marquer comme reçue"
                            >
                              <FiCheckCircle size={14} />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setConfirmAnnuler(c)}
                              disabled={isPending}
                              className="p-1.5 rounded-[6px] hover:bg-red-50 text-danger transition-colors disabled:opacity-50"
                              title="Annuler"
                            >
                              <FiXCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              total={commandes.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              className="px-4 py-3 border-t border-[#f0f2f5]"
            />
          </div>
        )}
      </div>

      {/* Détail commande */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[520px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <h3 className="font-bold text-[16px] text-ink">{selected.numeroCommande}</h3>
                <p className="text-[12px] text-subtle mt-0.5">{selected.fournisseur.nom} · {new Date(selected.dateCommande).toLocaleDateString("fr-FR")}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-subtle hover:text-ink text-[22px] leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-subtle text-left border-b border-line">
                    <th className="pb-2 font-medium">Médicament</th>
                    <th className="pb-2 font-medium text-right">Commandé</th>
                    <th className="pb-2 font-medium text-right">Reçu</th>
                    <th className="pb-2 font-medium text-right">P.U.</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lignesCommande.map((l) => (
                    <tr key={l.id} className="border-b border-[#f0f2f5]">
                      <td className="py-2 text-ink">{l.medicament.denomination}</td>
                      <td className="py-2 text-right text-subtle">{l.quantiteCommandee}</td>
                      <td className="py-2 text-right text-subtle">{l.quantiteRecue}</td>
                      <td className="py-2 text-right text-subtle whitespace-nowrap">{Number(l.prixUnitaire).toLocaleString("fr-FR")} Ar</td>
                      <td className="py-2 text-right font-semibold text-ink whitespace-nowrap">{Number(l.sousTotal).toLocaleString("fr-FR")} Ar</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-line">
              <div className="flex justify-between text-[14px] font-bold">
                <span className="text-ink">Total</span>
                <span className="text-primary">{Number(selected.montantTotal).toLocaleString("fr-FR")} Ar</span>
              </div>
              {selected.notes && (
                <p className="mt-2 text-[12px] text-subtle italic">{selected.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm recevoir */}
      {confirmRecevoir && (
        <ConfirmModal
          title="Marquer comme reçue ?"
          message={
            <>
              La commande <strong className="text-[#1a1e2a]">{confirmRecevoir.numeroCommande}</strong> sera marquée comme reçue et le stock sera mis à jour.
            </>
          }
          confirmLabel="Confirmer la réception"
          danger={false}
          isPending={isPending}
          onConfirm={() => handleRecevoir(confirmRecevoir)}
          onCancel={() => setConfirmRecevoir(null)}
        />
      )}

      {/* Confirm annuler */}
      {confirmAnnuler && (
        <ConfirmModal
          title="Annuler cette commande ?"
          message={
            <>
              La commande <strong className="text-[#1a1e2a]">{confirmAnnuler.numeroCommande}</strong> sera définitivement annulée.
            </>
          }
          confirmLabel="Annuler la commande"
          danger={true}
          isPending={isPending}
          onConfirm={() => handleAnnuler(confirmAnnuler)}
          onCancel={() => setConfirmAnnuler(null)}
        />
      )}

      {showModal && (
        <NouvelleCommandeModal
          fournisseurs={fournisseurs}
          medicaments={medicaments}
          pharmacieId={pharmacieId}
          utilisateurId={utilisateurId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setPage(1);
            toast.success("Commande créée avec succès.");
          }}
        />
      )}
    </>
  );
}
