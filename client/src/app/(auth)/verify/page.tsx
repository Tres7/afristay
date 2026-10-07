"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-url";
import type { BackendAuthResponse } from "@/types/api/auth";
import AuthShell from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";

const API_URL = getApiBaseUrl();
const EMPTY = ["", "", "", "", "", ""];

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [emailKnown, setEmailKnown] = useState(!!searchParams.get("email"));
  const [digits, setDigits] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const autoResent = useRef(false);

  const code = digits.join("");

  // sessionStorage n'existe que côté navigateur
  useEffect(() => {
    const stored = sessionStorage.getItem("verify_email");
    if (!email && stored) {
      setEmail(stored);
      setEmailKnown(true);
    }
    inputs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (codeVal = code) => {
    if (codeVal.length !== 6 || loading || !email) return;
    setError("");
    setSuccess("");
    setLoading(true);

    let data: Partial<BackendAuthResponse> & { detail?: string; code?: string };
    try {
      const res = await fetch(`${API_URL}/v1/auth/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeVal }),
      });
      data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === "already_verified") {
          router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
          return;
        }
        setError(data.detail ?? "Code invalide ou expiré.");
        setDigits(EMPTY);
        inputs.current[0]?.focus();
        setLoading(false);
        return;
      }
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
      return;
    }

    sessionStorage.removeItem("verify_email");

    // Le backend renvoie directement les tokens : ouverture de session sans mot de passe
    if (data.access && data.refresh && data.user) {
      const loginRes = await signIn("backend-session", {
        redirect: false,
        id: data.user.id,
        name: `${data.user.first_name} ${data.user.last_name}`,
        email: data.user.email,
        image: data.user.avatar_url ?? "",
        role: data.user.role,
        accessToken: data.access,
        refreshToken: data.refresh,
      });
      if (!loginRes?.error) {
        router.push(data.user.role === "hote" ? "/hote/espace?bienvenue=1" : "/?bienvenue=1");
        router.refresh();
        return;
      }
    }

    router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
  };

  const handleChange = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length > 1) {
      // Saisie automatique (SMS / gestionnaire) de plusieurs chiffres
      const next = clean.slice(0, 6).split("");
      const filled = [...next, ...EMPTY].slice(0, 6);
      setDigits(filled);
      inputs.current[Math.min(next.length, 5)]?.focus();
      if (next.length === 6) handleSubmit(next.join(""));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
    if (next.join("").length === 6) handleSubmit(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(""));
      handleSubmit(pasted);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/v1/auth/resend-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess("Un nouveau code a été envoyé à votre adresse e-mail.");
        setCooldown(60);
      } else if (res.status === 429) {
        setCooldown(data.retry_after ?? 60);
        setError(data.detail ?? "Veuillez patienter avant de redemander un code.");
      } else if (data.code === "already_verified") {
        router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
      } else {
        setError(data.detail ?? "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    }
    setResending(false);
  };

  // Arrivée depuis la connexion d'un compte non vérifié : on renvoie un code frais
  useEffect(() => {
    if (searchParams.get("resend") === "1" && email && !autoResent.current) {
      autoResent.current = true;
      handleResend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <>
      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <Mail size={26} className="text-primary" />
      </div>

      <h1 className="font-heading font-bold text-3xl text-dark mb-2">Vérification e-mail</h1>

      {emailKnown ? (
        <>
          <p className="text-gray-500 text-sm mb-1">Saisissez le code à 6 chiffres envoyé à</p>
          <p className="font-semibold text-dark text-sm mb-8 break-all">{email}</p>
        </>
      ) : (
        <div className="mb-8">
          <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Adresse e-mail du compte à vérifier</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
            placeholder="vous@exemple.com"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl text-center font-medium mb-6">{error}</div>
      )}
      {success && (
        <div role="status" className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl text-center font-medium mb-6">{success}</div>
      )}

      <div className="flex gap-2 sm:gap-3 justify-center mb-8" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Chiffre ${i + 1}`}
            maxLength={i === 0 ? 6 : 1}
            value={d}
            disabled={loading}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "w-11 h-14 sm:w-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20",
              d ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-dark"
            )}
          />
        ))}
      </div>

      <button
        onClick={() => handleSubmit()}
        disabled={loading || code.length !== 6 || !email}
        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none text-sm"
      >
        {loading ? "Vérification..." : "Vérifier mon compte"}
      </button>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 mb-2">Vous n&apos;avez pas reçu le code ? Pensez à vérifier vos spams.</p>
        <button
          onClick={handleResend}
          disabled={resending || cooldown > 0 || !email}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
          {resending ? "Envoi en cours..." : cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Mauvaise adresse ?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">Recommencer l&apos;inscription</Link>
      </p>
    </>
  );
}

export default function VerifyPage() {
  return (
    <AuthShell
      reverse
      image="https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?q=80&w=2000&auto=format&fit=crop"
      title="Vérifiez votre adresse e-mail"
      subtitle="Un code à 6 chiffres vous a été envoyé. Il est valable 10 minutes."
    >
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}
