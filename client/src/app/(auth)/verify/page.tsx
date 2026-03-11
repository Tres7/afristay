"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? sessionStorage.getItem("verify_email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.join("").length === 6) handleSubmit(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (codeVal = code) => {
    if (codeVal.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/v1/auth/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeVal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Code invalide ou expiré.");
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        setLoading(false);
        return;
      }
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
      return;
    }

    // Connexion automatique après vérification
    const password = sessionStorage.getItem("verify_password") ?? "";
    if (password) {
      const loginRes = await signIn("credentials", { redirect: false, email, password });
      sessionStorage.removeItem("verify_email");
      sessionStorage.removeItem("verify_password");
      if (!loginRes?.error) {
        router.push("/");
        router.refresh();
        return;
      }
    }

    // Fallback : rediriger vers login
    router.push("/login?verified=1");
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/v1/auth/resend-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) setSuccess("Un nouveau code a été envoyé à votre adresse e-mail.");
      else setError(data.detail ?? "Erreur lors de l'envoi.");
    } catch {
      setError("Impossible de contacter le serveur.");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex flex-row-reverse">
      {/* Right Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542314831-c6a4d27ce6a2?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-700/80 via-primary/60 to-orange-900/70" />
        <div className="relative z-10 flex flex-col justify-center p-12 h-full w-full">
          <div className="text-white max-w-md">
            <h2 className="font-heading font-bold text-4xl leading-tight mb-4">
              Vérifiez votre adresse e-mail
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Un code à 6 chiffres a été envoyé à votre adresse. Il est valable 10 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Left Panel — Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="inline-block mb-8 lg:hidden">
            <img src="/logo.png" alt="AfriStay" className="h-10 w-auto" onError={(e) => { e.currentTarget.src = "https://i.ibb.co/3WfK91p/afristay.png"; }} />
          </Link>

          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Mail size={26} className="text-primary" />
          </div>

          <h1 className="font-heading font-bold text-3xl text-dark mb-2">Vérification e-mail</h1>
          <p className="text-gray-500 text-sm mb-2">
            Code envoyé à
          </p>
          <p className="font-semibold text-dark text-sm mb-8">{email}</p>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl text-center font-medium mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl text-center font-medium mb-6">
              {success}
            </div>
          )}

          {/* Code inputs */}
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                  ${d ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-dark"}
                  focus:border-primary focus:ring-2 focus:ring-primary/20`}
              />
            ))}
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={loading || code.length !== 6}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-button hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none text-sm"
          >
            {loading ? "Vérification..." : "Vérifier mon compte"}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Vous n&apos;avez pas reçu le code ?</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {resending ? "Envoi en cours..." : "Renvoyer le code"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Mauvaise adresse ?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Recommencer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
