"use client";

import { useState, useTransition } from "react";
import { FiX, FiAlertCircle } from "react-icons/fi";
import type { Medicament, Categorie, Fournisseur, StatutMedicament } from "@prisma/client";
import { createMedicament, updateMedicament, type MedicamentFormData } from "../actions";

type Props = {
  medicament?: Medicament | null;
  categories: Categorie[];
  fournisseurs: Fournisseur[];
  onClose: () => void;
  onSuccess?: () => void;
};

const STATUTS: StatutMedicament[] = ["actif", "inactif", "discontinue"];

export default function MedicamentModal({ medicament, categories, fournisseurs, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<MedicamentFormData>({
    denomination: medicament?.denomination ?? "",
    dci: medicament?.dci ?? "",
    forme: medicament?.forme ?? "",
    dosage: medicament?.dosage ?? "",
    conditionnement: medicament?.conditionnement ?? "",
    codeBarres: medicament?.codeBarres ?? "",
    prixAchat: Number(medicament?.prixAchat ?? 0),
    prixVente: Number(medicament?.prixVente ?? 0),
    stockMinimum: medicament?.stockMinimum ?? 10,
    stockActuel: medicament?.stockActuel ?? 0,
    prescriptionRequise: medicament?.prescriptionRequise ?? false,
    categorieId: medicament?.categorieId ?? "",
    fournisseurId: medicament?.fournisseurId ?? "",
    statut: medicament?.statut ?? "actif",
  });

  function setField(field: keyof MedicamentFormData, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field as string]; return n; });
  }

  const isValid = form.denomination.trim() !== "" && form.prixVente > 0;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.denomination.trim()) e.denomination = "La dénomination est requise.";
    if (form.prixVente <= 0) e.prixVente = "Le prix de vente doit être supérieur à 0.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setServerError("");
    startTransition(async () => {
      try {
        if (medicament) {
          await updateMedicament(medicament.id, form);
        } else {
          await createMedicament(form);
        }
        onSuccess?.();
      } catch {
        setServerError("Une erreur est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[680px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e5ed]">
          <h3 className="text-[#1a1e2a] font-bold text-[17px]">
            {medicament ? "Modifier le médicament" : "Nouveau médicament"}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f6f7fa] text-[#737e94] transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="overflow-y-auto flex-1 p-6 space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-4 py-3 text-[13px]">
              <FiAlertCircle size={15} />
              {serverError}
            </div>
          )}

          {/* Section Identification */}
          <div>
            <p className="text-[11px] font-semibold text-[#737e94] uppercase tracking-wider mb-3">Identification</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Dénomination *</label>
                <input
                  type="text"
                  value={form.denomination}
                  onChange={(e) => setField("denomination", e.target.value)}
                  className={`w-full border rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 ${fieldErrors.denomination ? "border-[#E24B4A] focus:border-[#E24B4A]" : "border-[#e0e5ed] focus:border-[#0F6E56]"}`}
                  placeholder="Paracétamol 500mg comprimés"
                />
                {fieldErrors.denomination && (
                  <p className="mt-1 text-[11px] text-[#E24B4A]">{fieldErrors.denomination}</p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">DCI</label>
                <input
                  type="text"
                  value={form.dci ?? ""}
                  onChange={(e) => setField("dci", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                  placeholder="Paracétamol"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Code-barres</label>
                <input
                  type="text"
                  value={form.codeBarres ?? ""}
                  onChange={(e) => setField("codeBarres", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                  placeholder="3400936543528"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Forme</label>
                <input
                  type="text"
                  value={form.forme ?? ""}
                  onChange={(e) => setField("forme", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                  placeholder="Comprimé, Sirop, Injectable…"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Dosage</label>
                <input
                  type="text"
                  value={form.dosage ?? ""}
                  onChange={(e) => setField("dosage", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                  placeholder="500 mg"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Conditionnement</label>
                <input
                  type="text"
                  value={form.conditionnement ?? ""}
                  onChange={(e) => setField("conditionnement", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                  placeholder="Boîte de 16 comprimés"
                />
              </div>
            </div>
          </div>

          {/* Section Classification */}
          <div>
            <p className="text-[11px] font-semibold text-[#737e94] uppercase tracking-wider mb-3">Classification</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Catégorie</label>
                <select
                  value={form.categorieId ?? ""}
                  onChange={(e) => setField("categorieId", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Fournisseur</label>
                <select
                  value={form.fournisseurId ?? ""}
                  onChange={(e) => setField("fournisseurId", e.target.value)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Statut</label>
                <select
                  value={form.statut}
                  onChange={(e) => setField("statut", e.target.value as StatutMedicament)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-white"
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="prescription"
                  checked={form.prescriptionRequise}
                  onChange={(e) => setField("prescriptionRequise", e.target.checked)}
                  className="w-4 h-4 accent-[#0F6E56]"
                />
                <label htmlFor="prescription" className="text-[13px] text-[#1a1e2a]">Ordonnance requise</label>
              </div>
            </div>
          </div>

          {/* Section Prix & Stock */}
          <div>
            <p className="text-[11px] font-semibold text-[#737e94] uppercase tracking-wider mb-3">Prix & Stock</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Prix d&apos;achat (Ar)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prixAchat}
                  onChange={(e) => setField("prixAchat", parseFloat(e.target.value) || 0)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Prix de vente (Ar) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prixVente}
                  onChange={(e) => setField("prixVente", parseFloat(e.target.value) || 0)}
                  className={`w-full border rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 ${fieldErrors.prixVente ? "border-[#E24B4A] focus:border-[#E24B4A]" : "border-[#e0e5ed] focus:border-[#0F6E56]"}`}
                />
                {fieldErrors.prixVente && (
                  <p className="mt-1 text-[11px] text-[#E24B4A]">{fieldErrors.prixVente}</p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Stock actuel</label>
                <input
                  type="number"
                  min="0"
                  value={form.stockActuel}
                  onChange={(e) => setField("stockActuel", parseInt(e.target.value) || 0)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#1a1e2a] mb-1">Stock minimum</label>
                <input
                  type="number"
                  min="0"
                  value={form.stockMinimum}
                  onChange={(e) => setField("stockMinimum", parseInt(e.target.value) || 0)}
                  className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e0e5ed]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#737e94] hover:bg-[#f6f7fa] transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="px-5 py-2 bg-[#0F6E56] hover:bg-[#0a5a45] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[8px] text-[13px] font-semibold transition-colors"
          >
            {isPending ? "Enregistrement…" : medicament ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
