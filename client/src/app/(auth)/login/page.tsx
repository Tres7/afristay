"use client";

import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import FormField from "@/components/ui/FormField";

/** N'autorise que les redirections internes (évite les open redirects). */
function safeCallback(url: string | null): string {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);

  const notice =
    searchParams.get("verified") === "1"
      ? "Compte vérifié ! Vous pouvez maintenant vous connecter."
      : searchParams.get("reset") === "1"
        ? "Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe."
        : searchParams.get("expired") === "1"
          ? "Votre session a expiré. Merci de vous reconnecter."
          : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverified(false);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim().toLowerCase(),
      password,
    });

    if (res?.error) {
      if (res.code === "unverified_email") {
        setUnverified(true);
        setError("Votre compte n'est pas encore vérifié.");
      } else if (res.code === "inactive") {
        setError("Ce compte a été désactivé. Contactez le support.");
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <>
      <h1 className="font-heading font-bold text-3xl text-dark mb-2">Connexion</h1>
      <p className="text-gray-500 text-sm mb-8">Connectez-vous pour réserver et retrouver vos voyages.</p>

      {notice && (
        <div role="status" className="p-3 mb-6 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl text-center font-medium">
          {notice}
        </div>
      )}

      <GoogleButton label="Continuer avec Google" callbackUrl={callbackUrl} onError={setError} />

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl text-center font-medium">
            {error}
            {unverified && (
              <>
                {" "}
                <Link href={`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}&resend=1`} className="underline font-bold">
                  Vérifier maintenant
                </Link>
              </>
            )}
          </div>
        )}

        <FormField
          label="Adresse e-mail" name="email" type="email" icon={Mail}
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com" autoComplete="email" inputMode="email" required
        />

        <div>
          <FormField
            label="Mot de passe" name="password" type={showPassword ? "text" : "password"} icon={Lock}
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" required
            trailing={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-gray-400 hover:text-dark" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <div className="text-right mt-2">
            <Link href={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs text-primary font-medium hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none text-sm"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">Créer un compte</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=2072&auto=format&fit=crop"
      title="Découvrez des séjours authentiques en Afrique"
      subtitle="Villas, riads, appartements et auberges sélectionnés, avec paiement Mobile Money ou carte."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
