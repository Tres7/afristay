"use client";

import Link from "next/link";
import { Mail, Lock, User, Phone, Eye, EyeOff, Plane, Home } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-url";
import { firstErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/auth/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import FormField from "@/components/ui/FormField";

type Role = "voyageur" | "hote";
type FieldErrors = Partial<Record<"email" | "first_name" | "last_name" | "phone" | "password" | "password_confirm" | "role", string>>;

const ROLES: { id: Role; label: string; icon: typeof Plane }[] = [
  { id: "voyageur", label: "Voyageur", icon: Plane },
  { id: "hote", label: "Hôte", icon: Home },
];

function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Trop court", "Faible", "Moyen", "Bon", "Fort", "Excellent"];
  return { score, label: labels[score] };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(searchParams.get("role") === "hote" ? "hote" : "voyageur");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", password_confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [existingAccount, setExistingAccount] = useState(false);

  const strength = passwordStrength(form.password);
  const mismatch = form.password_confirm.length > 0 && form.password !== form.password_confirm;

  const update = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setExistingAccount(false);

    if (form.password.length < 8) {
      setFieldErrors({ password: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (mismatch) {
      setFieldErrors({ password_confirm: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);
    const email = form.email.trim().toLowerCase();

    try {
      const res = await fetch(`${getApiBaseUrl()}/v1/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email, role, phone: form.phone.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 409) {
          const errs: FieldErrors = {};
          for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            const msg = firstErrorMessage(value);
            if (msg) errs[key as keyof FieldErrors] = msg;
          }
          setFieldErrors(errs);
          if (res.status === 409 && errs.email) setExistingAccount(true);
          if (!Object.keys(errs).length) setError(firstErrorMessage(data) ?? "Données invalides.");
        } else {
          setError("Une erreur est survenue côté serveur. Veuillez réessayer.");
        }
        setLoading(false);
        return;
      }
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("verify_email", email);
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  };

  return (
    <>
      <h1 className="font-heading font-bold text-3xl text-dark mb-2">Créer un compte</h1>
      <p className="text-gray-500 text-sm mb-8">Quelques informations pour commencer votre aventure.</p>

      <GoogleButton label="S'inscrire avec Google" callbackUrl="/" onError={setError} />

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Je suis</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                aria-pressed={role === id}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                  role === id ? "bg-primary text-white border-primary shadow-button" : "bg-white text-dark border-gray-200 hover:border-primary/40"
                )}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            {role === "hote" ? "Vous pourrez publier vos logements et aussi réserver." : "Vous pourrez devenir hôte plus tard depuis votre profil."}
          </p>
        </fieldset>

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
          <FormField label="Prénom" name="first_name" icon={User} value={form.first_name} onChange={update} placeholder="Ama" autoComplete="given-name" required error={fieldErrors.first_name} />
          <FormField label="Nom" name="last_name" icon={User} value={form.last_name} onChange={update} placeholder="Koffi" autoComplete="family-name" required error={fieldErrors.last_name} />
        </div>

        <div>
          <FormField label="Adresse e-mail" name="email" type="email" icon={Mail} value={form.email} onChange={update} placeholder="vous@exemple.com" autoComplete="email" inputMode="email" required error={fieldErrors.email} />
          {existingAccount && (
            <p className="text-xs text-gray-500 mt-1.5 ml-1">
              C&apos;est vous ?{" "}
              <Link href={`/login?email=${encodeURIComponent(form.email)}`} className="text-primary font-bold hover:underline">Se connecter</Link>
              {" "}ou{" "}
              <Link href={`/verify?email=${encodeURIComponent(form.email.trim().toLowerCase())}`} className="text-primary font-bold hover:underline">vérifier le compte</Link>
            </p>
          )}
        </div>

        <FormField
          label={<>Téléphone <span className="text-gray-400 normal-case font-normal">(optionnel)</span></>}
          name="phone" type="tel" icon={Phone} value={form.phone} onChange={update}
          placeholder="+228 90 00 00 00" autoComplete="tel" inputMode="tel"
          hint="Format international avec indicatif pays."
          error={fieldErrors.phone}
        />

        <div>
          <FormField
            label="Mot de passe" name="password" type={showPassword ? "text" : "password"} icon={Lock}
            value={form.password} onChange={update} placeholder="••••••••" autoComplete="new-password" required
            error={fieldErrors.password}
            trailing={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-gray-400 hover:text-dark" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          {form.password && !fieldErrors.password && (
            <div className="mt-2 ml-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full", i <= strength.score ? (strength.score <= 2 ? "bg-red-400" : strength.score === 3 ? "bg-amber-400" : "bg-green-500") : "bg-gray-200")} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{strength.label} — évitez les mots de passe courants ou uniquement numériques.</p>
            </div>
          )}
        </div>

        <FormField
          label="Confirmer le mot de passe" name="password_confirm" type={showPassword ? "text" : "password"} icon={Lock}
          value={form.password_confirm} onChange={update} placeholder="••••••••" autoComplete="new-password" required
          error={fieldErrors.password_confirm ?? (mismatch ? "Les mots de passe ne correspondent pas." : undefined)}
        />

        <div className="flex items-start gap-2 pt-1">
          <input type="checkbox" id="terms" className="mt-1 accent-primary w-4 h-4 flex-shrink-0" required />
          <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
            J&apos;accepte les{" "}
            <Link href="/cgu" target="_blank" className="text-primary font-medium underline">
              Conditions générales d&apos;utilisation<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
            </Link>{" "}
            d&apos;AfriStay.
          </label>
        </div>

        {/* Information RGPD : le compte repose sur le contrat (CGU), pas sur un consentement à cocher */}
        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
          Vos données servent uniquement à gérer votre compte et vos réservations. Le téléphone est facultatif. Vous pouvez
          consulter, modifier ou supprimer vos données à tout moment.{" "}
          <Link href="/confidentialite" target="_blank" className="text-primary font-medium underline">
            Politique de confidentialité<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
          </Link>
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none text-sm mt-2"
        >
          {loading ? "Création en cours..." : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">Se connecter</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell
      reverse
      image="https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?q=80&w=2000&auto=format&fit=crop"
      title="Rejoignez la communauté AfriStay"
      subtitle="Réservez des hébergements vérifiés, sauvegardez vos coups de cœur et échangez directement avec les hôtes."
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
