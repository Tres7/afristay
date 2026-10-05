"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock, Mail } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-url";
import { firstErrorMessage } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/ui/FormField";

const API_URL = getApiBaseUrl();

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(firstErrorMessage(data) ?? "Erreur lors de l'envoi.");
      } else {
        setInfo(data.detail);
        setStep("code");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    }
    setLoading(false);
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (password !== passwordConfirm) {
      setFieldErrors({ password_confirm: "Les mots de passe ne correspondent pas." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, password, password_confirm: passwordConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errs: Record<string, string> = {};
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
          const msg = firstErrorMessage(v);
          if (msg && k !== "detail") errs[k] = msg;
        }
        setFieldErrors(errs);
        if (!Object.keys(errs).length) setError(firstErrorMessage(data) ?? "Réinitialisation impossible.");
        setLoading(false);
        return;
      }
      router.push(`/login?reset=1&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <KeyRound size={26} className="text-primary" />
      </div>
      <h1 className="font-heading font-bold text-3xl text-dark mb-2">Mot de passe oublié</h1>
      <p className="text-gray-500 text-sm mb-8">
        {step === "email"
          ? "Indiquez l'adresse de votre compte, nous vous enverrons un code de réinitialisation."
          : "Saisissez le code reçu par e-mail et choisissez un nouveau mot de passe."}
      </p>

      {error && <div role="alert" className="p-3 mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl text-center font-medium">{error}</div>}
      {info && step === "code" && <div role="status" className="p-3 mb-5 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl text-center font-medium">{info}</div>}

      {step === "email" ? (
        <form onSubmit={requestCode} className="space-y-5">
          <FormField label="Adresse e-mail" name="email" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button disabled:opacity-50 text-sm">
            {loading ? "Envoi..." : "Recevoir un code"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <FormField label="Code reçu" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} icon={KeyRound} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" required error={fieldErrors.code} />
          <FormField label="Nouveau mot de passe" name="password" type="password" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••" required minLength={8} error={fieldErrors.password} hint="8 caractères minimum, évitez les mots de passe courants." />
          <FormField label="Confirmer" name="password_confirm" type="password" icon={Lock} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} autoComplete="new-password" placeholder="••••••••" required error={fieldErrors.password_confirm} />
          <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button disabled:opacity-50 text-sm">
            {loading ? "Enregistrement..." : "Changer mon mot de passe"}
          </button>
          <button type="button" onClick={() => requestCode()} disabled={loading} className="w-full text-sm font-bold text-primary hover:underline disabled:opacity-50">
            Renvoyer un code
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link href="/login" className="font-bold text-primary hover:underline">Retour à la connexion</Link>
      </p>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=2072&auto=format&fit=crop"
      title="Pas de panique"
      subtitle="Un code par e-mail suffit pour retrouver l'accès à votre compte."
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
