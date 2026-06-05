"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmModal from "@/app/_components/ConfirmModal";
import {
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiList,
  FiRefreshCw,
  FiTruck,
  FiBarChart2,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

const navItems = [
  { icon: FiHome,         label: "Tableau de Bord",    href: "/dashboard" },
  { icon: FiPackage,      label: "Gestion de Stock",    href: "/stock" },
  { icon: FiShoppingCart, label: "Points de Vente",     href: "/ventes" },
  { icon: FiList,         label: "Historique Ventes",   href: "/historique" },
  { icon: FiRefreshCw,    label: "Réapprovisionnement", href: "/reappro" },
  { icon: FiTruck,        label: "Fournisseurs",        href: "/fournisseurs" },
  { icon: FiBarChart2,    label: "Rapports",            href: "/rapports" },
  { icon: FiSettings,     label: "Paramètres",          href: "/parametres" },
];

type UserInfo = { nom: string; prenom: string; role: string };

function MediFlowIcon({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      <circle cx="80" cy="80" r="68" fill="#085041" />
      <circle cx="80" cy="80" r="60" fill="#0F6E56" />
      <rect x="58" y="52" width="44" height="56" rx="7" fill="#1D9E75" />
      <rect x="52" y="58" width="56" height="44" rx="7" fill="#1D9E75" />
      <rect x="58" y="52" width="44" height="10" rx="7" fill="#5DCAA5" opacity="0.3" />
      <path d="M30 80 Q44 62 58 80 Q72 98 86 80 Q100 62 114 80 Q128 98 130 80"
        fill="none" stroke="#E1F5EE" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="80" r="5" fill="#5DCAA5" />
      <circle cx="130" cy="80" r="5" fill="#5DCAA5" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/utilisateurs/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.nom) setUser(data); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const initial = user ? user.prenom.charAt(0).toUpperCase() : "?";
  const displayName = user ? `${user.prenom} ${user.nom}` : "Chargement…";
  const roleLabel = user?.role === "admin" ? "Administrateur" : user?.role === "caissier" ? "Caissier" : "—";

  return (
    <>
    <aside className="fixed left-0 top-0 w-[240px] h-screen bg-[#0B2B23] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <MediFlowIcon size={36} />
        <div>
          <p className="text-white font-bold text-[15px] leading-tight">MediFlow</p>
          <p className="text-[#7BBBA6] text-[10px]">Gestion Pharmaceutique</p>
        </div>
      </div>

      <div className="mx-5 h-px bg-[#1a4a36] mb-2" />

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-[11px] rounded-[8px] text-[12px] font-medium transition-all ${
                active
                  ? "bg-[#0F6E56] text-white"
                  : "text-[#7BBBA6] hover:text-white hover:bg-[#0F3D2E]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 w-1 h-full bg-white rounded-r-[2px]" />
              )}
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profil utilisateur */}
      <div className="mx-3 mb-4 p-3 bg-[#163D2E] rounded-[8px] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0F6E56] rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-[11px]">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[12px] truncate">{displayName}</p>
          <p className="text-[#7BBBA6] text-[9px] truncate">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          title="Se déconnecter"
          className="text-[#7BBBA6] hover:text-white transition-colors shrink-0"
        >
          <FiLogOut size={14} />
        </button>
      </div>
    </aside>

    {showLogoutConfirm && (
      <ConfirmModal
        title="Se déconnecter ?"
        message="Vous allez être redirigé vers la page de connexion."
        confirmLabel="Se déconnecter"
        danger={false}
        isPending={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    )}
    </>
  );
}
