"use client";

import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Identifiants incorrects");
      setLoading(false);
    } else {
      router.push("/profil");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=2072&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-orange-800/70" />

        <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
          {/* Logo top */}
          <Link href="/">
            <img src="/logo.png" alt="AfriStay" className="h-10 w-auto brightness-0 invert" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
          </Link>

          {/* Text bottom */}
          <div className="text-white max-w-md">
            <h2 className="font-heading font-bold text-4xl leading-tight mb-4">
              Découvrez des séjours authentiques en Afrique
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Plus de 10 000 hébergements uniques vous attendent dans 30 pays africains. Réservez en toute confiance.
            </p>
            <div className="flex items-center gap-6 mt-8">
              <div>
                <p className="text-2xl font-bold">10k+</p>
                <p className="text-white/60 text-xs">Hébergements</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">30+</p>
                <p className="text-white/60 text-xs">Pays</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">50k+</p>
                <p className="text-white/60 text-xs">Voyageurs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 bg-light flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <Link href="/" className="inline-block mb-8 lg:hidden">
            <img src="/logo.png" alt="AfriStay" className="h-10 w-auto" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
          </Link>

          <h1 className="font-heading font-bold text-3xl text-dark mb-2">Connexion</h1>
          <p className="text-gray-500 text-sm mb-8">
            Connectez-vous pour accéder à votre espace voyageur.
          </p>

          {/* Social Login */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3.5 text-sm font-medium text-dark hover:bg-gray-50 transition-colors shadow-sm mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-medium">ou par e-mail</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-dark uppercase tracking-wide">
                  Mot de passe
                </label>
                <Link href="#" className="text-xs text-primary font-medium hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
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
            <Link href="/register" className="font-bold text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
