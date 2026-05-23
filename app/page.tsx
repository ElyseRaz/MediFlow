"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiShield,
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
} from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez renseigner votre email et mot de passe.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mot_de_passe: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Identifiants incorrects.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Panneau gauche ── */}
      <div
        className="hidden lg:flex flex-col w-[620px] min-h-screen relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #062018 0%, #0F6E56 100%)" }}
      >
        <div className="absolute top-[-80px] right-[-20px] w-[300px] h-[300px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-40px] left-[-60px] w-[240px] h-[240px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <div className="flex items-center gap-3 mb-16">
            <svg viewBox="0 0 160 160" width="34" height="34" aria-hidden="true" className="shrink-0">
              <circle cx="80" cy="80" r="68" fill="#085041" />
              <circle cx="80" cy="80" r="60" fill="#0F6E56" />
              <rect x="58" y="52" width="44" height="56" rx="7" fill="#1D9E75" />
              <rect x="52" y="58" width="56" height="44" rx="7" fill="#1D9E75" />
              <path d="M30 80 Q44 62 58 80 Q72 98 86 80 Q100 62 114 80 Q128 98 130 80" fill="none" stroke="#E1F5EE" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="30" cy="80" r="4" fill="#5DCAA5" />
              <circle cx="130" cy="80" r="4" fill="#5DCAA5" />
            </svg>
            <div className="flex gap-0">
              <span className="text-white font-bold text-[16px]">Medi</span>
              <span className="text-[#5DCAA5] font-light text-[16px]">Flow</span>
            </div>
          </div>

          <h1 className="text-white font-bold text-[26px] leading-tight mb-5 max-w-[360px]">
            &ldquo;Gérez votre pharmacie<br />avec précision et sécurité&rdquo;
          </h1>
          <p className="text-[#a8d5c8] text-[14px] mb-10">
            Solution complète pour les pharmacies de Madagascar
          </p>

          <ul className="space-y-4">
            {[
              "Gestion de stock temps réel",
              "Point de vente intégré",
              "Alertes expiration auto",
              "Rapports financiers",
              "Multi-utilisateurs",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <FiCheckCircle className="text-[#5DCAA5] shrink-0" size={17} />
                <span className="text-[#b0d9cc] text-[13px]">{f}</span>
              </li>
            ))}
          </ul>

          <p className="mt-auto text-[#8bbfb3] text-[12px]">
            Approuvé par +200 pharmacies à Madagascar
          </p>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex-1 bg-[#f6f7fa] flex items-center justify-center p-8">
        <div className="bg-white rounded-[20px] border border-[#e0e5ed] shadow-[0px_8px_32px_0px_rgba(15,26,61,0.12)] w-full max-w-[560px] px-10 py-8">

          <div className="flex justify-center mb-5">
            <img src="/logo.svg" alt="MediFlow" width="180" height="55" />
          </div>

          <h2 className="text-center text-[#1a1e2a] font-bold text-[24px] mb-1">
            Bon retour !
          </h2>
          <p className="text-center text-[#737e94] text-[13px] mb-6">
            Connectez-vous à votre espace MediFlow
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-[8px] bg-[#fdedec] border border-[#E24B4A]/30">
              <p className="text-[#E24B4A] text-[12px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                Adresse email
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]"
                  size={15}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mediflow.mg"
                  className="w-full h-11 pl-9 pr-3 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]"
                  size={15}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-10 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737e94] hover:text-[#1a1e2a]"
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            {/* Se souvenir */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-[18px] h-[18px] rounded-[3px] border flex items-center justify-center cursor-pointer transition-colors ${
                    rememberMe
                      ? "bg-[#0F6E56] border-[#0F6E56]"
                      : "bg-white border-[#e0e5ed]"
                  }`}
                >
                  {rememberMe && (
                    <span className="text-white text-[10px] font-bold leading-none">✓</span>
                  )}
                </div>
                <span className="text-[#737e94] text-[12px]">Se souvenir de moi</span>
              </label>
              <button type="button" className="text-[#0F6E56] text-[12px] hover:underline">
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-[#0F6E56] hover:bg-[#0a5a45] disabled:opacity-60 rounded-[12px] text-white font-semibold text-[16px] transition-colors"
            >
              {loading ? "Connexion en cours…" : "→ Se connecter"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e0e5ed]" />
            <span className="text-[#737e94] text-[12px]">ou continuer avec</span>
            <div className="flex-1 h-px bg-[#e0e5ed]" />
          </div>

          <button className="w-full h-12 border border-[#e0e5ed] rounded-[10px] flex items-center justify-center gap-3 text-[#1a1e2a] font-semibold text-[13px] hover:bg-[#f6f7fa] transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center mt-5 text-[13px]">
            <span className="text-[#737e94]">Pas encore de compte ? </span>
            <Link href="/inscription" className="text-[#0F6E56] font-semibold hover:underline">
              Créer un compte →
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
