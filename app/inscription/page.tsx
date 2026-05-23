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
  FiHome,
  FiCheckCircle,
} from "react-icons/fi";

type Step = 1 | 2;

export default function InscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 — Pharmacie
  const [nomPharmacie, setNomPharmacie] = useState("");

  // Étape 2 — Compte admin
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function validateStep1() {
    if (!nomPharmacie.trim()) {
      setError("Le nom de la pharmacie est requis.");
      return false;
    }
    return true;
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (validateStep1()) setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nom.trim() || !prenom.trim() || !email.trim() || !password) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Le mot de passe doit contenir au moins une majuscule.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Le mot de passe doit contenir au moins un chiffre.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          prenom,
          email,
          mot_de_passe: password,
          role: "admin",
          nom_pharmacie: nomPharmacie,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue lors de l'inscription.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  const passwordRules = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "1 majuscule", ok: /[A-Z]/.test(password) },
    { label: "1 chiffre", ok: /[0-9]/.test(password) },
  ];

  return (
    <div className="flex min-h-screen">
      {/* ── Panneau gauche ── */}
      <div
        className="hidden lg:flex flex-col w-[520px] min-h-screen relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #062018 0%, #0F6E56 100%)" }}
      >
        <div className="absolute top-[-80px] right-[-20px] w-[300px] h-[300px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-40px] left-[-60px] w-[240px] h-[240px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
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

          <h1 className="text-white font-bold text-[24px] leading-tight mb-4">
            Créez votre espace<br />pharmacie en 2 minutes
          </h1>
          <p className="text-[#a8d5c8] text-[13px] mb-10">
            Configurez votre pharmacie et commencez à gérer votre stock immédiatement.
          </p>

          {/* Étapes */}
          <div className="space-y-6">
            {[
              { num: 1, title: "Votre pharmacie", desc: "Nom et informations de base" },
              { num: 2, title: "Compte administrateur", desc: "Identifiants de connexion" },
            ].map((s) => (
              <div key={s.num} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all ${
                    step > s.num
                      ? "bg-[#5DCAA5] text-white"
                      : step === s.num
                      ? "bg-[#0F6E56] text-white ring-4 ring-[#0F6E56]/30"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <div>
                  <p
                    className={`font-semibold text-[13px] ${
                      step >= s.num ? "text-white" : "text-white/40"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p
                    className={`text-[11px] ${
                      step >= s.num ? "text-[#a8d5c8]" : "text-white/25"
                    }`}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-auto text-[#8bbfb3] text-[12px]">
            Approuvé par +200 pharmacies à Madagascar
          </p>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex-1 bg-[#f6f7fa] flex items-center justify-center p-8">
        <div className="bg-white rounded-[20px] border border-[#e0e5ed] shadow-[0px_8px_32px_0px_rgba(15,26,61,0.12)] w-full max-w-[520px] px-10 py-8">

          {/* En-tête */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-[#e6f5f0] rounded-[16px] flex items-center justify-center">
              {step === 1 ? (
                <FiHome size={26} className="text-[#0F6E56]" />
              ) : (
                <FiUser size={26} className="text-[#0F6E56]" />
              )}
            </div>
          </div>

          <h2 className="text-center text-[#1a1e2a] font-bold text-[22px] mb-1">
            {step === 1 ? "Votre pharmacie" : "Compte administrateur"}
          </h2>
          <p className="text-center text-[#737e94] text-[12px] mb-1">
            Étape {step} sur 2
          </p>
          {/* Barre progression */}
          <div className="h-1 bg-[#e0e5ed] rounded-full mb-6">
            <div
              className="h-1 bg-[#0F6E56] rounded-full transition-all"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-[8px] bg-[#fdedec] border border-[#E24B4A]/30">
              <p className="text-[#E24B4A] text-[12px]">{error}</p>
            </div>
          )}

          {/* ── Étape 1 ── */}
          {step === 1 && (
            <form onSubmit={goToStep2} className="space-y-4">
              <div>
                <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                  Nom de la pharmacie <span className="text-[#E24B4A]">*</span>
                </label>
                <div className="relative">
                  <FiHome
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]"
                    size={15}
                  />
                  <input
                    type="text"
                    value={nomPharmacie}
                    onChange={(e) => setNomPharmacie(e.target.value)}
                    placeholder="Pharmacie Centrale de Tana"
                    className="w-full h-11 pl-9 pr-3 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-[#f6f7fa] rounded-[10px] p-4 space-y-2">
                <p className="text-[#1a1e2a] font-semibold text-[11px]">Inclus dans votre compte</p>
                {[
                  "Gestion de stock illimitée",
                  "Point de vente (caisse)",
                  "Alertes expiration automatiques",
                  "Rapports et statistiques",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <FiCheckCircle size={13} className="text-[#5DCAA5] shrink-0" />
                    <span className="text-[#737e94] text-[11px]">{f}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full h-[48px] bg-[#0F6E56] hover:bg-[#0a5a45] rounded-[12px] text-white font-semibold text-[14px] transition-colors"
              >
                Continuer →
              </button>
            </form>
          )}

          {/* ── Étape 2 ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                    Prénom <span className="text-[#E24B4A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean"
                    className="w-full h-11 px-3 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                    Nom <span className="text-[#E24B4A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Rakoto"
                    className="w-full h-11 px-3 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                  Adresse email <span className="text-[#E24B4A]">*</span>
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
                    placeholder="admin@mapharmacie.mg"
                    className="w-full h-11 pl-9 pr-3 rounded-[8px] border border-[#e0e5ed] text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                  Mot de passe <span className="text-[#E24B4A]">*</span>
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
                {/* Règles mot de passe */}
                {password.length > 0 && (
                  <div className="flex gap-3 mt-2">
                    {passwordRules.map((r) => (
                      <div key={r.label} className="flex items-center gap-1">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.ok ? "bg-[#5DCAA5]" : "bg-[#e0e5ed]"
                          }`}
                        />
                        <span
                          className={`text-[10px] ${r.ok ? "text-[#5DCAA5]" : "text-[#737e94]"}`}
                        >
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#1a1e2a] font-semibold text-[12px] mb-1">
                  Confirmer le mot de passe <span className="text-[#E24B4A]">*</span>
                </label>
                <div className="relative">
                  <FiShield
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e94]"
                    size={15}
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full h-11 pl-9 pr-10 rounded-[8px] border text-[12px] text-[#1a1e2a] placeholder:text-[#737e94] focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      confirm.length > 0 && confirm !== password
                        ? "border-[#E24B4A] focus:ring-[#E24B4A]"
                        : "border-[#e0e5ed] focus:ring-[#0F6E56]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737e94] hover:text-[#1a1e2a]"
                  >
                    {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {confirm.length > 0 && confirm !== password && (
                  <p className="text-[10px] text-[#E24B4A] mt-1">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="h-[48px] px-5 border border-[#e0e5ed] rounded-[12px] text-[#737e94] font-semibold text-[13px] hover:bg-[#f6f7fa] transition-colors"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-[48px] bg-[#0F6E56] hover:bg-[#0a5a45] disabled:opacity-60 rounded-[12px] text-white font-semibold text-[14px] transition-colors"
                >
                  {loading ? "Création en cours…" : "Créer mon compte →"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center mt-5 text-[13px]">
            <span className="text-[#737e94]">Déjà un compte ? </span>
            <Link href="/" className="text-[#0F6E56] font-semibold hover:underline">
              Se connecter →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
