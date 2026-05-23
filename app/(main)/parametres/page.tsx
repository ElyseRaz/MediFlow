"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiUser,
  FiLock,
  FiHome,
  FiUsers,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiShield,
} from "react-icons/fi";
import { useToast } from "@/app/_components/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "profil" | "pharmacie" | "utilisateurs";

type Me = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "admin" | "caissier";
  actif: boolean;
  pharmacie: { id: string; nom: string };
};

type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "admin" | "caissier";
  actif: boolean;
  dernierConnexion: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#737e94] uppercase tracking-wide mb-1">{label}</label>
      <p className="text-[#1a1e2a] text-[13px] font-medium">{value || "—"}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#737e94] uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-9 rounded-[8px] border px-3 text-[12px] text-[#1a1e2a] focus:outline-none transition-colors ${
          error ? "border-[#E24B4A] focus:border-[#E24B4A]" : "border-[#e0e5ed] focus:border-[#0F6E56]"
        }`}
      />
      {error && <p className="mt-1 text-[11px] text-[#E24B4A]">{error}</p>}
    </div>
  );
}

function InlineError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="text-[12px] px-4 py-2 rounded-[8px] bg-[#fdedec] text-[#E24B4A]">
      {msg}
    </div>
  );
}

// ── Tab Profil ────────────────────────────────────────────────────────────────

function TabProfil({ me, onRefresh }: { me: Me; onRefresh: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(me.nom);
  const [prenom, setPrenom] = useState(me.prenom);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [showPwd, setShowPwd] = useState(false);
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<Record<string, string>>({});
  const [pwdServerError, setPwdServerError] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const isValidProfile = prenom.trim() !== "" && nom.trim() !== "";
  const isValidPwd = ancien !== "" && nouveau.length >= 8 && nouveau === confirm;

  async function saveProfile() {
    const e: Record<string, string> = {};
    if (!prenom.trim()) e.prenom = "Le prénom est requis.";
    if (!nom.trim()) e.nom = "Le nom est requis.";
    if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setFieldErrors({});
    setSaving(true);
    setServerError("");
    try {
      const r = await fetch("/api/utilisateurs/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, prenom }),
      });
      if (!r.ok) {
        const d = await r.json();
        setServerError(d.error ?? "Erreur lors de la mise à jour.");
      } else {
        setEditing(false);
        onRefresh();
        toast.success("Profil mis à jour avec succès.");
      }
    } catch {
      setServerError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    const e: Record<string, string> = {};
    if (!ancien) e.ancien = "Le mot de passe actuel est requis.";
    if (!nouveau) e.nouveau = "Le nouveau mot de passe est requis.";
    else if (nouveau.length < 8) e.nouveau = "Le mot de passe doit contenir au moins 8 caractères.";
    if (!confirm) e.confirm = "Veuillez confirmer le nouveau mot de passe.";
    else if (nouveau !== confirm) e.confirm = "Les mots de passe ne correspondent pas.";
    if (Object.keys(e).length > 0) { setPwdFieldErrors(e); return; }
    setPwdFieldErrors({});
    setPwdSaving(true);
    setPwdServerError("");
    try {
      const r = await fetch("/api/utilisateurs/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPwdServerError(d.error ?? "Erreur.");
      } else {
        setAncien("");
        setNouveau("");
        setConfirm("");
        setShowPwd(false);
        toast.success("Mot de passe changé avec succès.");
      }
    } catch {
      setPwdServerError("Erreur réseau.");
    } finally {
      setPwdSaving(false);
    }
  }

  const roleLabel = me.role === "admin" ? "Administrateur" : "Caissier";

  return (
    <div className="space-y-4">
      {/* Carte profil */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-6 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0F6E56] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[18px]">
                {me.prenom.charAt(0)}{me.nom.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-[#1a1e2a] font-bold text-[16px]">{me.prenom} {me.nom}</p>
              <p className="text-[#737e94] text-[12px]">{me.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${me.role === "admin" ? "bg-[#e6f5f0] text-[#0F6E56]" : "bg-[#e8f8f3] text-[#5DCAA5]"}`}>
                <FiShield size={9} />
                {roleLabel}
              </span>
            </div>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setNom(me.nom); setPrenom(me.prenom); setServerError(""); setFieldErrors({}); }}
              className="flex items-center gap-2 h-8 px-3 rounded-[8px] bg-[#f6f7fa] text-[#737e94] hover:bg-[#e6f5f0] hover:text-[#0F6E56] text-[12px] font-medium transition-colors"
            >
              <FiEdit2 size={12} />
              Modifier
            </button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" value={me.prenom} />
            <Field label="Nom" value={me.nom} />
            <Field label="Email" value={me.email} />
            <Field label="Rôle" value={roleLabel} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={prenom}
                onChange={(v) => { setPrenom(v); setFieldErrors((p) => { const n = { ...p }; delete n.prenom; return n; }); }}
                error={fieldErrors.prenom}
              />
              <Input
                label="Nom"
                value={nom}
                onChange={(v) => { setNom(v); setFieldErrors((p) => { const n = { ...p }; delete n.nom; return n; }); }}
                error={fieldErrors.nom}
              />
            </div>
            <InlineError msg={serverError} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || !isValidProfile}
                className="flex items-center gap-2 h-9 px-4 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiCheck size={13} />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 h-9 px-4 bg-[#f6f7fa] text-[#737e94] text-[12px] font-medium rounded-[8px] hover:bg-[#e0e5ed] transition-colors"
              >
                <FiX size={13} />
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-6 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#f6f7fa] rounded-[8px] flex items-center justify-center">
              <FiLock size={15} className="text-[#737e94]" />
            </div>
            <div>
              <p className="text-[#1a1e2a] font-semibold text-[13px]">Mot de passe</p>
              <p className="text-[#737e94] text-[11px]">Modifiez votre mot de passe de connexion</p>
            </div>
          </div>
          {!showPwd && (
            <button
              type="button"
              onClick={() => { setShowPwd(true); setPwdServerError(""); setPwdFieldErrors({}); }}
              className="flex items-center gap-2 h-8 px-3 rounded-[8px] bg-[#f6f7fa] text-[#737e94] hover:bg-[#e6f5f0] hover:text-[#0F6E56] text-[12px] font-medium transition-colors"
            >
              <FiEdit2 size={12} />
              Changer
            </button>
          )}
        </div>

        {showPwd && (
          <div className="space-y-3">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={ancien}
              onChange={(v) => { setAncien(v); setPwdFieldErrors((p) => { const n = { ...p }; delete n.ancien; return n; }); }}
              error={pwdFieldErrors.ancien}
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={nouveau}
              onChange={(v) => { setNouveau(v); setPwdFieldErrors((p) => { const n = { ...p }; delete n.nouveau; return n; }); }}
              placeholder="8+ caractères requis"
              error={pwdFieldErrors.nouveau}
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirm}
              onChange={(v) => { setConfirm(v); setPwdFieldErrors((p) => { const n = { ...p }; delete n.confirm; return n; }); }}
              error={pwdFieldErrors.confirm}
            />
            <InlineError msg={pwdServerError} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={changePassword}
                disabled={pwdSaving || !isValidPwd}
                className="flex items-center gap-2 h-9 px-4 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiCheck size={13} />
                {pwdSaving ? "Enregistrement…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => { setShowPwd(false); setAncien(""); setNouveau(""); setConfirm(""); setPwdServerError(""); setPwdFieldErrors({}); }}
                className="flex items-center gap-2 h-9 px-4 bg-[#f6f7fa] text-[#737e94] text-[12px] font-medium rounded-[8px] hover:bg-[#e0e5ed] transition-colors"
              >
                <FiX size={13} />
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab Pharmacie ─────────────────────────────────────────────────────────────

function TabPharmacie({ me }: { me: Me }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-6 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-[#0F6E56] rounded-[14px] flex items-center justify-center shrink-0">
            <FiHome size={22} className="text-white" />
          </div>
          <div>
            <p className="text-[#1a1e2a] font-bold text-[16px]">{me.pharmacie.nom}</p>
            <p className="text-[#737e94] text-[12px]">Pharmacie associée à votre compte</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom de la pharmacie" value={me.pharmacie.nom} />
          <Field label="Identifiant" value={me.pharmacie.id} />
        </div>
      </div>
    </div>
  );
}

// ── Tab Utilisateurs ──────────────────────────────────────────────────────────

type NewUserForm = {
  nom: string;
  prenom: string;
  email: string;
  role: "admin" | "caissier";
  mot_de_passe_temp: string;
};

function TabUtilisateurs({ me }: { me: Me }) {
  const toast = useToast();
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>({ nom: "", prenom: "", email: "", role: "caissier", mot_de_passe_temp: "" });
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const isValidForm =
    form.nom.trim() !== "" &&
    form.prenom.trim() !== "" &&
    form.email.trim() !== "" &&
    isValidEmail(form.email) &&
    form.mot_de_passe_temp !== "";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/utilisateurs");
      if (r.ok) setUsers(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me.role === "admin") loadUsers();
  }, [me.role, loadUsers]);

  function setField(field: keyof NewUserForm, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setFieldErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = "Le prénom est requis.";
    if (!form.nom.trim()) e.nom = "Le nom est requis.";
    if (!form.email.trim()) e.email = "L'email est requis.";
    else if (!isValidEmail(form.email)) e.email = "L'adresse email n'est pas valide.";
    if (!form.mot_de_passe_temp) e.mot_de_passe_temp = "Le mot de passe temporaire est requis.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function createUser() {
    if (!validateForm()) return;
    setCreating(true);
    setServerError("");
    try {
      const r = await fetch("/api/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        setServerError(d.error ?? "Erreur lors de la création.");
      } else {
        toast.success(`Utilisateur ${d.prenom} ${d.nom} créé avec succès.`);
        setForm({ nom: "", prenom: "", email: "", role: "caissier", mot_de_passe_temp: "" });
        setShowForm(false);
        loadUsers();
      }
    } catch {
      setServerError("Erreur réseau.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActif(u: Utilisateur) {
    try {
      await fetch(`/api/utilisateurs/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !u.actif }),
      });
      loadUsers();
      toast.success(u.actif ? `${u.prenom} ${u.nom} désactivé.` : `${u.prenom} ${u.nom} activé.`);
    } catch {
      toast.error("Impossible de modifier le statut.");
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-12 flex flex-col items-center text-center shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        <FiShield size={36} className="text-[#d0d6e0] mb-3" />
        <p className="text-[#737e94] text-[13px]">Cette section est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bouton créer */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setServerError(""); setFieldErrors({}); }}
          className="flex items-center gap-2 h-9 px-4 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] transition-colors"
        >
          <FiPlus size={13} />
          Nouvel utilisateur
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="bg-white rounded-[12px] border border-[#e0e5ed] p-6 shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
          <h3 className="text-[#1a1e2a] font-semibold text-[14px] mb-4">Créer un utilisateur</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Prénom"
              value={form.prenom}
              onChange={(v) => setField("prenom", v)}
              error={fieldErrors.prenom}
            />
            <Input
              label="Nom"
              value={form.nom}
              onChange={(v) => setField("nom", v)}
              error={fieldErrors.nom}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setField("email", v)}
              error={fieldErrors.email}
            />
            <div>
              <label className="block text-[11px] font-medium text-[#737e94] uppercase tracking-wide mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "caissier" })}
                className="w-full h-9 rounded-[8px] border border-[#e0e5ed] px-3 text-[12px] text-[#1a1e2a] focus:outline-none focus:border-[#0F6E56] bg-white"
              >
                <option value="caissier">Caissier</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="col-span-2">
              <Input
                label="Mot de passe temporaire"
                type="password"
                value={form.mot_de_passe_temp}
                onChange={(v) => setField("mot_de_passe_temp", v)}
                placeholder="L'utilisateur devra le changer"
                error={fieldErrors.mot_de_passe_temp}
              />
            </div>
          </div>
          <InlineError msg={serverError} />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={createUser}
              disabled={creating || !isValidForm}
              className="flex items-center gap-2 h-9 px-4 bg-[#0F6E56] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#0a5a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiCheck size={13} />
              {creating ? "Création…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 h-9 px-4 bg-[#f6f7fa] text-[#737e94] text-[12px] font-medium rounded-[8px] hover:bg-[#e0e5ed] transition-colors"
            >
              <FiX size={13} />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-[12px] border border-[#e0e5ed] shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
        {loading ? (
          <div className="p-8 text-center text-[#737e94] text-[13px]">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#737e94] text-[13px]">Aucun utilisateur trouvé.</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#e0e5ed] bg-[#f9fafb]">
                {["Utilisateur", "Email", "Rôle", "Statut", "Dernière connexion", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#737e94] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#f0f2f5] hover:bg-[#fafbfc]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0F6E56] rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-bold">{u.prenom.charAt(0)}{u.nom.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-[#1a1e2a]">{u.prenom} {u.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#737e94]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.role === "admin" ? "bg-[#e6f5f0] text-[#0F6E56]" : "bg-[#f6f7fa] text-[#737e94]"}`}>
                      <FiShield size={9} />
                      {u.role === "admin" ? "Admin" : "Caissier"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.actif ? "bg-[#e8f8f3] text-[#5DCAA5]" : "bg-[#f6f7fa] text-[#737e94]"}`}>
                      {u.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#737e94]">
                    {u.dernierConnexion
                      ? new Date(u.dernierConnexion).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                      : "Jamais"}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me.id && (
                      <button
                        type="button"
                        onClick={() => toggleActif(u)}
                        className={`h-7 px-3 rounded-[6px] text-[11px] font-medium transition-colors ${u.actif ? "bg-[#fdedec] text-[#E24B4A] hover:bg-[#f9c6c6]" : "bg-[#e8f8f3] text-[#5DCAA5] hover:bg-[#c8ede2]"}`}
                      >
                        {u.actif ? "Désactiver" : "Activer"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profil",        label: "Mon profil",  icon: FiUser },
  { id: "pharmacie",     label: "Pharmacie",   icon: FiHome },
  { id: "utilisateurs",  label: "Utilisateurs", icon: FiUsers },
];

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profil");
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState("");

  const loadMe = useCallback(async () => {
    try {
      const r = await fetch("/api/utilisateurs/me");
      if (r.ok) setMe(await r.json());
      else setErr("Impossible de charger votre profil.");
    } catch {
      setErr("Erreur réseau.");
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[#1a1e2a] font-bold text-[20px]">Paramètres</h2>
        <p className="text-[#737e94] text-[13px] mt-0.5">Profil, pharmacie et gestion des utilisateurs</p>
      </div>

      {err && <InlineError msg={err} />}

      {me && (
        <>
          {/* Onglets */}
          <div className="flex gap-1 bg-white rounded-[12px] border border-[#e0e5ed] p-1 w-fit shadow-[0px_2px_8px_0px_rgba(15,26,61,0.05)]">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-medium transition-all ${
                  activeTab === id
                    ? "bg-[#0F6E56] text-white shadow-sm"
                    : "text-[#737e94] hover:text-[#1a1e2a] hover:bg-[#f6f7fa]"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {activeTab === "profil"       && <TabProfil me={me} onRefresh={loadMe} />}
          {activeTab === "pharmacie"    && <TabPharmacie me={me} />}
          {activeTab === "utilisateurs" && <TabUtilisateurs me={me} />}
        </>
      )}

      {!me && !err && (
        <div className="text-[#737e94] text-[13px] px-1">Chargement…</div>
      )}
    </div>
  );
}
