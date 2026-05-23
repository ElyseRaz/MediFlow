"use client";

import { useState, useMemo, useTransition } from "react";
import { FiSearch, FiEdit2, FiTruck, FiMail, FiPhone, FiPlus, FiToggleLeft, FiToggleRight, FiAlertCircle } from "react-icons/fi";
import type { Fournisseur } from "@prisma/client";
import { createFournisseur, updateFournisseur, toggleFournisseurActif, type FournisseurFormData } from "../actions";
import { useToast } from "@/app/_components/Toast";
import Pagination from "@/app/_components/Pagination";

const PAGE_SIZE = 6;

type Props = { fournisseurs: Fournisseur[]; initialSearch?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function FournisseurModal({
  fournisseur,
  onClose,
  onSuccess,
}: {
  fournisseur?: Fournisseur | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setFormState] = useState<FournisseurFormData>({
    nom: fournisseur?.nom ?? "",
    contact: fournisseur?.contact ?? "",
    telephone: fournisseur?.telephone ?? "",
    email: fournisseur?.email ?? "",
    adresse: fournisseur?.adresse ?? "",
    actif: fournisseur?.actif ?? true,
  });

  function setField(field: keyof FournisseurFormData, value: string | boolean) {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field as string]; return n; });
  }

  function validateEmail(email: string) {
    if (email && !isValidEmail(email)) {
      setFieldErrors((prev) => ({ ...prev, email: "L'adresse email n'est pas valide." }));
    } else {
      setFieldErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
    }
  }

  const isValid =
    form.nom.trim() !== "" &&
    (!form.email || isValidEmail(form.email));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.nom.trim()) e.nom = "Le nom du fournisseur est requis.";
    if (form.email && !isValidEmail(form.email)) e.email = "L'adresse email n'est pas valide.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setServerError("");
    startTransition(async () => {
      try {
        if (fournisseur) {
          await updateFournisseur(fournisseur.id, form);
        } else {
          await createFournisseur(form);
        }
        onSuccess?.();
      } catch {
        setServerError("Une erreur est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[480px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-bold text-[17px] text-ink">{fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
          <button type="button" onClick={onClose} className="text-subtle hover:text-ink text-[22px] leading-none">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-4">
          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-4 py-3 text-[13px]">
              <FiAlertCircle size={15} /> {serverError}
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Nom *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setField("nom", e.target.value)}
              className={`w-full border rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary ${fieldErrors.nom ? "border-[#E24B4A]" : "border-line"}`}
              placeholder="Nom du fournisseur"
            />
            {fieldErrors.nom && (
              <p className="mt-1 text-[11px] text-[#E24B4A]">{fieldErrors.nom}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Contact</label>
              <input
                type="text"
                value={form.contact ?? ""}
                onChange={(e) => setField("contact", e.target.value)}
                className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary"
                placeholder="Nom du contact"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.telephone ?? ""}
                onChange={(e) => setField("telephone", e.target.value)}
                className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary"
                placeholder="+261 34 000 0000"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              className={`w-full border rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary ${fieldErrors.email ? "border-[#E24B4A]" : "border-line"}`}
              placeholder="contact@fournisseur.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-[11px] text-[#E24B4A]">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse ?? ""}
              onChange={(e) => setField("adresse", e.target.value)}
              className="w-full border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary"
              placeholder="Adresse complète"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="actif"
              checked={form.actif}
              onChange={(e) => setField("actif", e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="actif" className="text-[13px] text-ink">Fournisseur actif</label>
          </div>
        </form>
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
            {isPending ? "Enregistrement…" : fournisseur ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FournisseursClient({ fournisseurs, initialSearch = "" }: Props) {
  const toast = useToast();
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<Fournisseur | null | "new">(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() =>
    fournisseurs.filter((f) => {
      const q = search.toLowerCase();
      return !q || f.nom.toLowerCase().includes(q) || (f.contact ?? "").toLowerCase().includes(q) || (f.email ?? "").toLowerCase().includes(q);
    }),
    [fournisseurs, search]
  );

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  function handleToggle(f: Fournisseur) {
    startTransition(async () => {
      try {
        await toggleFournisseurActif(f.id, !f.actif);
        toast.success(f.actif ? `"${f.nom}" désactivé.` : `"${f.nom}" activé.`);
      } catch {
        toast.error("Impossible de modifier le statut.");
      }
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Total fournisseurs</p>
          <p className="text-[26px] font-bold text-violet">{fournisseurs.length}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Actifs</p>
          <p className="text-[26px] font-bold text-success">{fournisseurs.filter((f) => f.actif).length}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-4">
          <p className="text-[12px] text-subtle mb-1">Inactifs</p>
          <p className="text-[26px] font-bold text-subtle">{fournisseurs.filter((f) => !f.actif).length}</p>
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
            placeholder="Rechercher par nom, contact ou email…"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-[8px] text-[13px] text-ink focus:outline-none focus:border-primary bg-surface"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] hover:bg-[#0a5a45] text-white rounded-[8px] text-[13px] font-semibold transition-colors"
        >
          <FiPlus size={15} /> Nouveau fournisseur
        </button>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-line shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-[#efe9fd] rounded-[14px] flex items-center justify-center mb-3">
            <FiTruck size={24} className="text-violet" />
          </div>
          <p className="font-semibold text-[15px] text-ink mb-1">Aucun fournisseur trouvé</p>
          <p className="text-subtle text-[13px]">
            {fournisseurs.length === 0 ? "Commencez par ajouter vos fournisseurs." : "Aucun résultat pour cette recherche."}
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((f) => (
            <div key={f.id} className={`bg-white rounded-[12px] border shadow-sm p-5 flex flex-col gap-3 transition-colors ${f.actif ? "border-line" : "border-line opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#efe9fd] rounded-[10px] flex items-center justify-center flex-shrink-0">
                    <FiTruck size={18} className="text-violet" />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-ink leading-tight">{f.nom}</p>
                    {f.contact && <p className="text-[12px] text-subtle">{f.contact}</p>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {f.actif ? "Actif" : "Inactif"}
                </span>
              </div>
              {(f.telephone || f.email) && (
                <div className="space-y-1">
                  {f.telephone && (
                    <div className="flex items-center gap-2 text-[12px] text-subtle">
                      <FiPhone size={12} /> {f.telephone}
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-2 text-[12px] text-subtle truncate">
                      <FiMail size={12} /> {f.email}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-[#f0f2f5]">
                <button
                  type="button"
                  onClick={() => setEditTarget(f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-line text-[12px] font-medium text-subtle hover:border-primary hover:text-primary transition-colors"
                >
                  <FiEdit2 size={12} /> Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(f)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-line text-[12px] font-medium text-subtle hover:border-line transition-colors disabled:opacity-50"
                >
                  {f.actif ? <FiToggleRight size={14} className="text-success" /> : <FiToggleLeft size={14} />}
                  {f.actif ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="px-1 py-2"
        />
        </>
      )}

      {editTarget !== null && (
        <FournisseurModal
          fournisseur={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            toast.success(editTarget === "new" ? "Fournisseur ajouté avec succès." : "Fournisseur mis à jour.");
          }}
        />
      )}
    </>
  );
}
