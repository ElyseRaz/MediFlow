"use client";

import { usePathname, useRouter } from "next/navigation";
import { FiBell, FiSearch, FiAlertTriangle, FiX, FiTruck, FiPackage } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard":    { title: "Tableau de bord",       description: "Vue d'ensemble de votre activité" },
  "/stock":        { title: "Stock de médicaments",  description: "Gérez l'inventaire et les niveaux de stock" },
  "/ventes":       { title: "Point de vente",         description: "Enregistrement des ventes et encaissement" },
  "/historique":   { title: "Historique des ventes", description: "Toutes les transactions enregistrées" },
  "/reappro":      { title: "Réapprovisionnement",   description: "Commandes fournisseurs et réceptions" },
  "/fournisseurs": { title: "Fournisseurs",           description: "Gestion des partenaires et fournisseurs" },
  "/rapports":     { title: "Rapports",               description: "Analyse de vos ventes et état de votre stock" },
  "/parametres":   { title: "Paramètres",             description: "Profil, pharmacie et gestion des utilisateurs" },
};

type Alert = {
  id: string;
  type_alerte: "stock_faible" | "rupture" | "expiration_proche" | "lot_expire";
  denomination: string;
  detail: string;
  lue: boolean;
};

type MedResult = {
  type: "medicament";
  id: string;
  denomination: string;
  dci: string | null;
  prixVente: number | string;
  categorie: { nom: string } | null;
};

type FourResult = {
  type: "fournisseur";
  id: string;
  nom: string;
  contact: string | null;
  email: string | null;
  actif: boolean;
};

type AnyResult = MedResult | FourResult;

type UserInfo = { nom: string; prenom: string; role: string };

const ALERT_CONFIG: Record<Alert["type_alerte"], { label: string; color: string; bg: string }> = {
  stock_faible:      { label: "Stock faible",      color: "text-[#EF9F27]", bg: "bg-[#FFF8EC]" },
  rupture:           { label: "Rupture de stock",  color: "text-[#E24B4A]", bg: "bg-[#FEF0F0]" },
  expiration_proche: { label: "Expiration proche", color: "text-[#EF9F27]", bg: "bg-[#FFF8EC]" },
  lot_expire:        { label: "Lot expiré",        color: "text-[#E24B4A]", bg: "bg-[#FEF0F0]" },
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const page = pageTitles[pathname] ?? { title: "MediFlow", description: "" };

  const [user, setUser] = useState<UserInfo | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [medResults, setMedResults] = useState<MedResult[]>([]);
  const [fourResults, setFourResults] = useState<FourResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/utilisateurs/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.nom) setUser(data); })
      .catch(() => {});

    fetch("/api/alertes?limit=50")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setAlerts(data); })
      .catch(() => {});
  }, []);

  // Fermeture au clic extérieur
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Recherche combinée avec debounce 300 ms
  useEffect(() => {
    if (searchQuery.length < 2) {
      setMedResults([]);
      setFourResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = encodeURIComponent(searchQuery);
        const [medRes, fourRes] = await Promise.allSettled([
          fetch(`/api/medicaments/search?q=${q}`).then((r) => r.ok ? r.json() : []),
          fetch(`/api/fournisseurs/search?q=${q}`).then((r) => r.ok ? r.json() : []),
        ]);

        const meds: MedResult[] = (medRes.status === "fulfilled" ? medRes.value : []).map(
          (m: Omit<MedResult, "type">) => ({ ...m, type: "medicament" as const })
        );
        const fours: FourResult[] = (fourRes.status === "fulfilled" ? fourRes.value : []).map(
          (f: Omit<FourResult, "type">) => ({ ...f, type: "fournisseur" as const })
        );

        setMedResults(meds);
        setFourResults(fours);
        setSearchOpen(true);
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function clearSearch() {
    setSearchQuery("");
    setSearchOpen(false);
    setMedResults([]);
    setFourResults([]);
  }

  function handleSelectMed(med: MedResult) {
    router.push(`/stock?q=${encodeURIComponent(med.denomination)}`);
    clearSearch();
  }

  function handleSelectFour(four: FourResult) {
    router.push(`/fournisseurs?q=${encodeURIComponent(four.nom)}`);
    clearSearch();
  }

  function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    fetch(`/api/alertes/${id}/lue`, { method: "PATCH" }).catch(() => {});
  }

  function dismissAllAlerts() {
    const ids = alerts.map((a) => a.id);
    setAlerts([]);
    ids.forEach((id) => fetch(`/api/alertes/${id}/lue`, { method: "PATCH" }).catch(() => {}));
  }

  const hasResults = medResults.length > 0 || fourResults.length > 0;
  const initials = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : "..";
  const displayName = user ? `${user.prenom} ${user.nom}` : "Chargement…";

  return (
    <header className="h-[60px] bg-white border-b border-[#e0e5ed] flex items-center px-5 gap-4 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-[#1a1e2a] font-semibold text-[16px] leading-tight truncate">{page.title}</h1>
        {page.description && (
          <p className="text-[#737e94] text-[11px] leading-tight truncate">{page.description}</p>
        )}
      </div>

      {/* ── Recherche ── */}
      <div ref={searchRef} className="relative">
        <div className="flex items-center gap-2 bg-[#f6f7fa] rounded-[8px] px-3 h-9 w-[260px] border border-transparent focus-within:border-[#0F6E56] focus-within:bg-white transition-colors">
          <FiSearch size={13} className="text-[#737e94] shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (hasResults) setSearchOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") clearSearch();
            }}
            placeholder="Médicaments, fournisseurs…"
            className="bg-transparent text-[12px] text-[#1a1e2a] outline-none w-full placeholder:text-[#737e94]"
          />
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="shrink-0">
              <FiX size={12} className="text-[#737e94] hover:text-[#1a1e2a]" />
            </button>
          )}
        </div>

        {/* Dropdown résultats */}
        {(searchOpen || searchLoading) && searchQuery.length >= 2 && (
          <div className="absolute top-[calc(100%+6px)] left-0 w-[360px] bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_8px_24px_rgba(15,26,61,0.12)] z-50 overflow-hidden">
            {searchLoading ? (
              <div className="px-4 py-3 text-[12px] text-[#737e94]">Recherche en cours…</div>
            ) : !hasResults ? (
              <div className="px-4 py-3 text-[12px] text-[#737e94]">
                Aucun résultat pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;
              </div>
            ) : (
              <div>
                {/* Section médicaments */}
                {medResults.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                      <FiPackage size={11} className="text-[#737e94]" />
                      <span className="text-[10px] font-bold text-[#737e94] uppercase tracking-wider">
                        Médicaments ({medResults.length})
                      </span>
                    </div>
                    {medResults.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => handleSelectMed(med)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#f6f7fa] transition-colors border-b border-[#f0f2f5] last:border-0"
                      >
                        <p className="text-[13px] font-semibold text-[#1a1e2a] truncate">{med.denomination}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {med.dci && (
                            <span className="text-[11px] text-[#737e94] truncate">{med.dci}</span>
                          )}
                          {med.categorie && (
                            <span className="text-[10px] bg-[#e6f5f0] text-[#0F6E56] px-1.5 py-0.5 rounded-full shrink-0">
                              {med.categorie.nom}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-[#0F6E56] ml-auto shrink-0">
                            {Number(med.prixVente).toLocaleString("fr-FR")} Ar
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Section fournisseurs */}
                {fourResults.length > 0 && (
                  <div className={medResults.length > 0 ? "border-t border-[#e0e5ed]" : ""}>
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                      <FiTruck size={11} className="text-[#737e94]" />
                      <span className="text-[10px] font-bold text-[#737e94] uppercase tracking-wider">
                        Fournisseurs ({fourResults.length})
                      </span>
                    </div>
                    {fourResults.map((four) => (
                      <button
                        key={four.id}
                        type="button"
                        onClick={() => handleSelectFour(four)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#f6f7fa] transition-colors border-b border-[#f0f2f5] last:border-0"
                      >
                        <p className="text-[13px] font-semibold text-[#1a1e2a] truncate">{four.nom}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {four.contact && (
                            <span className="text-[11px] text-[#737e94]">{four.contact}</span>
                          )}
                          {four.email && (
                            <span className="text-[11px] text-[#737e94] truncate">{four.email}</span>
                          )}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto shrink-0 ${four.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {four.actif ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer liens */}
                <div className="border-t border-[#e0e5ed] flex">
                  {medResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { router.push(`/stock?q=${encodeURIComponent(searchQuery)}`); clearSearch(); }}
                      className={`flex-1 py-2 text-[11px] text-[#0F6E56] font-semibold hover:bg-[#e6f5f0] transition-colors ${fourResults.length > 0 ? "border-r border-[#e0e5ed]" : ""}`}
                    >
                      Tout le stock →
                    </button>
                  )}
                  {fourResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { router.push(`/fournisseurs?q=${encodeURIComponent(searchQuery)}`); clearSearch(); }}
                      className="flex-1 py-2 text-[11px] text-[#8c4ee9] font-semibold hover:bg-[#efe9fd] transition-colors"
                    >
                      Tous les fournisseurs →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">

        {/* Cloche notifications */}
        <div ref={bellRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAlerts((v) => !v)}
            className="w-9 h-9 bg-[#f6f7fa] rounded-[10px] flex items-center justify-center hover:bg-[#e6f5f0] transition-colors"
          >
            <FiBell size={15} className="text-[#1a1e2a]" />
          </button>
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-[#E24B4A] rounded-full text-white text-[8px] font-bold flex items-center justify-center leading-none pointer-events-none">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}

          {/* Dropdown alertes */}
          {showAlerts && (
            <div className="absolute top-[calc(100%+6px)] right-0 w-[340px] bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_8px_24px_rgba(15,26,61,0.12)] z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e5ed]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#1a1e2a]">Alertes</span>
                  {alerts.length > 0 && (
                    <span className="text-[10px] bg-[#E24B4A] text-white px-2 py-0.5 rounded-full font-semibold">
                      {alerts.length}
                    </span>
                  )}
                </div>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={dismissAllAlerts}
                    className="text-[11px] text-[#737e94] hover:text-[#E24B4A] font-medium transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-[#737e94]">
                  Aucune alerte active
                </div>
              ) : (
                <ul className="max-h-[320px] overflow-y-auto divide-y divide-[#f0f2f5]">
                  {alerts.map((alert) => {
                    const cfg = ALERT_CONFIG[alert.type_alerte];
                    return (
                      <li key={alert.id} className={`px-4 py-3 ${cfg.bg} group`}>
                        <div className="flex items-start gap-2">
                          <FiAlertTriangle size={13} className={`${cfg.color} shrink-0 mt-0.5`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-[#1a1e2a] truncate">
                              {alert.denomination}
                            </p>
                            <p className="text-[11px] text-[#737e94] mt-0.5">{alert.detail}</p>
                            <span className={`text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissAlert(alert.id)}
                            className="shrink-0 p-0.5 rounded hover:bg-black/10 text-[#737e94] hover:text-[#1a1e2a] transition-colors opacity-0 group-hover:opacity-100"
                            title="Supprimer cette alerte"
                          >
                            <FiX size={11} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-[#e0e5ed]">
                <button
                  type="button"
                  onClick={() => { router.push("/rapports"); setShowAlerts(false); }}
                  className="w-full py-2.5 text-[11px] text-[#0F6E56] font-semibold hover:bg-[#e6f5f0] transition-colors"
                >
                  Voir les rapports →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <button type="button" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-[#0F6E56] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">{initials}</span>
          </div>
          <span className="text-[#1a1e2a] font-semibold text-[12px]">{displayName} ▾</span>
        </button>
      </div>
    </header>
  );
}
