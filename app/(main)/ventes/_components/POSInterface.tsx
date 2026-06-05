"use client";

import { useState, useMemo, useTransition } from "react";
import {
  FiSearch, FiShoppingCart, FiTrash2,
  FiCreditCard, FiCheckCircle, FiAlertTriangle, FiPrinter, FiPlus
} from "react-icons/fi";
import type { Medicament, Categorie } from "@prisma/client";
import { createVente, type LigneVenteInput } from "../actions";
import { openTicket } from "./ticketUtils";
import Pagination from "@/app/_components/Pagination";

const PAGE_SIZE = 15;

type MedWithCat = Medicament & { categorie: Categorie | null };

type CartItem = {
  medicament: MedWithCat;
  quantite: number;
  prixUnitaire: number;
  tauxRemise: number;
};

type LigneReceipt = {
  denomination: string;
  quantite: number;
  prixUnitaire: number;
  tauxRemise: number;
  sousTotal: number;
};

type ReceiptData = {
  numeroVente: string;
  montantTotal: number;
  monnaie: number;
  montantPaye: number;
  modePaiement: string;
  date: string;
  lignes: LigneReceipt[];
};

type Props = {
  medicaments: MedWithCat[];
  pharmacieId: string;
  utilisateurId: string;
};

const MODES_PAIEMENT = [
  { value: "especes",       label: "Espèces" },
  { value: "carte_bancaire", label: "Carte bancaire" },
  { value: "mobile_money",  label: "Mobile Money" },
  { value: "virement",      label: "Virement" },
] as const;

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  carte_bancaire: "Carte bancaire",
  mobile_money: "Mobile Money",
  virement: "Virement",
};

function ar(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} Ar`;
}

export default function POSInterface({ medicaments, pharmacieId, utilisateurId }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [modePaiement, setModePaiement] = useState<"especes" | "carte_bancaire" | "mobile_money" | "virement">("especes");
  const [montantPaye, setMontantPaye] = useState("");
  const [isPending, startTransition] = useTransition();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return medicaments;
    const q = search.toLowerCase();
    return medicaments.filter(
      (m) =>
        m.denomination.toLowerCase().includes(q) ||
        (m.dci ?? "").toLowerCase().includes(q) ||
        (m.codeBarres ?? "").toLowerCase().includes(q)
    );
  }, [medicaments, search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const totals = useMemo(() => {
    const total = cart.reduce((s, item) => {
      const remise = (item.prixUnitaire * item.quantite * item.tauxRemise) / 100;
      return s + item.prixUnitaire * item.quantite - remise;
    }, 0);
    const paye = parseFloat(montantPaye) || 0;
    return { total, paye, monnaie: Math.max(0, paye - total) };
  }, [cart, montantPaye]);

  function addToCart(med: MedWithCat) {
    setCart((prev) => {
      const existing = prev.find((i) => i.medicament.id === med.id);
      if (existing) {
        if (existing.quantite >= med.stockActuel) return prev;
        const newQty = existing.quantite + 1;
        setQtyInputs((q) => ({ ...q, [med.id]: String(newQty) }));
        return prev.map((i) =>
          i.medicament.id === med.id ? { ...i, quantite: newQty } : i
        );
      }
      if (med.stockActuel <= 0) return prev;
      setQtyInputs((q) => ({ ...q, [med.id]: "1" }));
      return [...prev, { medicament: med, quantite: 1, prixUnitaire: Number(med.prixVente), tauxRemise: 0 }];
    });
  }

  function commitQty(id: string, maxStock: number) {
    const raw = qtyInputs[id] ?? "";
    const qty = Math.min(Math.max(1, parseInt(raw) || 1), maxStock);
    setQtyInputs((q) => ({ ...q, [id]: String(qty) }));
    setCart((prev) => prev.map((i) => (i.medicament.id === id ? { ...i, quantite: qty } : i)));
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.medicament.id !== id));
    setQtyInputs((q) => { const n = { ...q }; delete n[id]; return n; });
  }

  function handleValider() {
    if (cart.length === 0) return;
    const paye = parseFloat(montantPaye) || 0;
    if (paye < totals.total) return;

    const cartSnapshot = cart.map((item) => {
      const remise = (item.prixUnitaire * item.quantite * item.tauxRemise) / 100;
      return {
        denomination: item.medicament.denomination,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        tauxRemise: item.tauxRemise,
        sousTotal: item.prixUnitaire * item.quantite - remise,
      };
    });
    const modeSnapshot = modePaiement;

    startTransition(async () => {
      const lignes: LigneVenteInput[] = cart.map((item) => ({
        medicamentId: item.medicament.id,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        tauxRemise: item.tauxRemise,
      }));
      const result = await createVente({ pharmacieId, utilisateurId, modePaiement, montantPaye: paye, lignes });
      setReceipt({
        ...result,
        montantPaye: paye,
        modePaiement: modeSnapshot,
        date: new Date().toISOString(),
        lignes: cartSnapshot,
      });
      setCart([]);
      setQtyInputs({});
      setMontantPaye("");
    });
  }

  // ── Écran ticket ──────────────────────────────────────────────────────────────
  if (receipt) {
    return (
      <div className="flex items-center justify-center min-h-[500px] py-6">
        <div className="bg-white rounded-[16px] border border-[#e0e5ed] shadow-lg w-full max-w-[420px] overflow-hidden">

          {/* En-tête vert */}
          <div className="bg-[#0F6E56] px-6 py-5 text-white">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FiCheckCircle size={20} className="text-[#5DCAA5]" />
              <span className="font-bold text-[16px]">Vente enregistrée</span>
            </div>
            <p className="text-center text-[#a8d8c8] text-[11px]">MediFlow — Pharmacie Grace</p>
            <div className="flex justify-between mt-3 pt-3 border-t border-white/20 text-[11px] text-[#c0e8dc]">
              <span>N° {receipt.numeroVente}</span>
              <span>{new Date(receipt.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
          </div>

          {/* Lignes du ticket */}
          <div className="px-5 py-4 border-b border-dashed border-[#e0e5ed] space-y-3">
            {receipt.lignes.map((l, i) => (
              <div key={i}>
                <p className="text-[12px] font-semibold text-[#1a1e2a] leading-tight">{l.denomination}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-[#737e94]">
                    {l.quantite} × {ar(l.prixUnitaire)}
                    {l.tauxRemise > 0 && <span className="text-[#EF9F27] ml-1">−{l.tauxRemise}%</span>}
                  </span>
                  <span className="text-[12px] font-semibold text-[#1a1e2a]">{ar(l.sousTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="px-5 py-4 space-y-2 border-b border-[#e0e5ed]">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#1a1e2a]">Total</span>
              <span className="text-[20px] font-bold text-[#0F6E56]">{ar(receipt.montantTotal)}</span>
            </div>
            <div className="h-px bg-[#f0f2f5]" />
            <div className="flex justify-between text-[12px]">
              <span className="text-[#737e94]">Mode de paiement</span>
              <span className="font-medium text-[#1a1e2a]">{MODE_LABELS[receipt.modePaiement] ?? receipt.modePaiement}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#737e94]">Montant reçu</span>
              <span className="font-medium text-[#1a1e2a]">{ar(receipt.montantPaye)}</span>
            </div>
            <div className="flex justify-between text-[12px] font-bold">
              <span className="text-[#737e94]">Monnaie rendue</span>
              <span className="text-[#5DCAA5]">{ar(receipt.monnaie)}</span>
            </div>
          </div>

          {/* Pied */}
          <div className="px-5 py-3 text-center text-[11px] text-[#737e94] border-b border-dashed border-[#e0e5ed]">
            Merci de votre confiance ! Bonne santé !
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-5 py-4">
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0a5a45] text-white rounded-[8px] text-[13px] font-semibold transition-colors"
            >
              <FiPlus size={14} />
              Nouvelle vente
            </button>
            <button
              type="button"
              onClick={() => openTicket(receipt)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#e0e5ed] rounded-[8px] text-[#737e94] hover:bg-[#f6f7fa] text-[13px] font-semibold transition-colors"
            >
              <FiPrinter size={14} />
              Imprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Interface POS ─────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 h-[calc(100vh-180px)] min-h-[600px]">
      {/* Catalogue */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="relative">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un médicament par nom, principe actif, code-barres…"
            className="w-full pl-10 pr-4 py-3 border border-[#e0e5ed] rounded-[10px] text-[14px] text-[#1a1e2a] bg-white focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10 shadow-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-[#737e94] text-[14px]">Aucun médicament trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {paginated.map((med) => {
                const inCart = cart.find((i) => i.medicament.id === med.id);
                const outOfStock = med.stockActuel <= 0;
                return (
                  <button
                    type="button"
                    key={med.id}
                    onClick={() => addToCart(med)}
                    disabled={outOfStock}
                    className={`text-left bg-white rounded-[12px] border p-4 transition-all hover:shadow-md active:scale-[0.98] ${
                      inCart
                        ? "border-[#0F6E56] ring-1 ring-[#0F6E56]/20"
                        : outOfStock
                        ? "border-[#e0e5ed] opacity-50 cursor-not-allowed"
                        : "border-[#e0e5ed] hover:border-[#a8d8c6]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1a1e2a] leading-tight truncate">{med.denomination}</p>
                        {med.dci && <p className="text-[11px] text-[#737e94] truncate">{med.dci}</p>}
                      </div>
                      {inCart && (
                        <span className="ml-2 w-5 h-5 bg-[#0F6E56] text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {inCart.quantite}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0F6E56]">
                        {Number(med.prixVente).toLocaleString("fr-FR")} Ar
                      </span>
                      <span className={`text-[11px] font-medium ${outOfStock ? "text-[#E24B4A]" : "text-[#737e94]"}`}>
                        {outOfStock ? "Épuisé" : `Stock : ${med.stockActuel}`}
                      </span>
                    </div>
                    {med.prescriptionRequise && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#8c4ee9] font-medium">
                        <FiAlertTriangle size={9} /> Ordonnance
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="py-2 border-t border-[#e0e5ed]"
        />
      </div>

      {/* Panier & paiement */}
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#e0e5ed]">
          <FiShoppingCart size={16} className="text-[#0F6E56]" />
          <span className="font-semibold text-[#1a1e2a] text-[14px]">Panier</span>
          {cart.length > 0 && (
            <span className="ml-auto text-[11px] text-[#737e94]">{cart.length} article{cart.length > 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FiShoppingCart size={28} className="text-[#e0e5ed] mb-2" />
              <p className="text-[#737e94] text-[13px]">Cliquez sur un médicament pour l&apos;ajouter</p>
            </div>
          ) : (
            cart.map((item) => {
              const remise = (item.prixUnitaire * item.quantite * item.tauxRemise) / 100;
              const sousTotal = item.prixUnitaire * item.quantite - remise;
              return (
                <div key={item.medicament.id} className="bg-[#f6f7fa] rounded-[10px] p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-[12px] font-semibold text-[#1a1e2a] leading-tight truncate">{item.medicament.denomination}</p>
                      <p className="text-[11px] text-[#737e94]">{item.prixUnitaire.toLocaleString("fr-FR")} Ar/u</p>
                    </div>
                    <button type="button" onClick={() => removeFromCart(item.medicament.id)} className="text-[#E24B4A] hover:bg-red-50 p-1 rounded transition-colors">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      min={1}
                      max={item.medicament.stockActuel}
                      value={qtyInputs[item.medicament.id] ?? String(item.quantite)}
                      onChange={(e) => setQtyInputs((q) => ({ ...q, [item.medicament.id]: e.target.value }))}
                      onBlur={() => commitQty(item.medicament.id, item.medicament.stockActuel)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitQty(item.medicament.id, item.medicament.stockActuel); }}
                      className="w-14 h-7 text-center border border-[#e0e5ed] rounded-[6px] text-[13px] font-bold text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]/20"
                    />
                    <span className="text-[13px] font-bold text-[#1a1e2a]">{sousTotal.toLocaleString("fr-FR")} Ar</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[#e0e5ed] p-4 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#f0f2f5]">
            <span className="text-[14px] font-semibold text-[#1a1e2a]">Total</span>
            <span className="text-[20px] font-bold text-[#0F6E56]">{totals.total.toLocaleString("fr-FR")} Ar</span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#737e94] uppercase tracking-wider mb-2">Mode de paiement</p>
            <div className="grid grid-cols-2 gap-1.5">
              {MODES_PAIEMENT.map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  onClick={() => setModePaiement(mode.value)}
                  className={`py-1.5 px-2 rounded-[7px] text-[11px] font-semibold border transition-colors ${
                    modePaiement === mode.value
                      ? "bg-[#0F6E56] border-[#0F6E56] text-white"
                      : "border-[#e0e5ed] text-[#737e94] hover:border-[#a8d8c6]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#737e94] uppercase tracking-wider mb-1.5">
              Montant reçu (Ar)
            </label>
            <input
              type="number"
              min={totals.total}
              step="100"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
              placeholder={totals.total.toString()}
              className="w-full border border-[#e0e5ed] rounded-[8px] px-3 py-2 text-[14px] font-semibold text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10"
            />
          </div>

          {totals.paye > 0 && (
            <div className={`flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] font-semibold ${
              totals.monnaie >= 0 ? "bg-green-50 text-[#5DCAA5]" : "bg-red-50 text-[#E24B4A]"
            }`}>
              <span>Monnaie à rendre</span>
              <span>{totals.monnaie.toLocaleString("fr-FR")} Ar</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleValider}
            disabled={cart.length === 0 || isPending || (parseFloat(montantPaye) || 0) < totals.total}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#0F6E56] hover:bg-[#0a5a45] disabled:opacity-50 text-white rounded-[10px] text-[14px] font-bold transition-colors"
          >
            <FiCreditCard size={16} />
            {isPending ? "Enregistrement…" : "Valider la vente"}
          </button>
        </div>
      </div>
    </div>
  );
}
