"use client";

import Link from "next/link";
import { Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("Compte créé pour : ", { firstName, lastName, email, phone });

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Erreur lors de la connexion automatique");
      setLoading(false);
    } else {
      router.push("/profil");
      router.refresh();
    }
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

        <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
          {/* Logo top */}
          <div className="flex justify-end">
            <Link href="/">
              <img src="/logo.png" alt="AfriStay" className="h-10 w-auto brightness-0 invert" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
            </Link>
          </div>

          {/* Text bottom */}
          <div className="text-white max-w-md">
            <h2 className="font-heading font-bold text-4xl leading-tight mb-4">
              Rejoignez la communauté AfriStay
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Créez votre compte pour réserver des hébergements uniques, sauvegarder vos favoris et profiter d&apos;offres sur mesure.
            </p>

            {/* Testimonial */}
            <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <p className="text-white/90 text-sm italic leading-relaxed mb-3">
                &ldquo;AfriStay m&apos;a permis de découvrir des endroits incroyables que je n&apos;aurais jamais trouvés autrement. Service exceptionnel !&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20" />
                <div>
                  <p className="text-white text-xs font-bold">Aminata Diallo</p>
                  <p className="text-white/60 text-xs">Voyageuse depuis 2023</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Panel — Form */}
      <div className="w-full lg:w-1/2 bg-light flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <Link href="/" className="inline-block mb-8 lg:hidden">
            <img src="/logo.png" alt="AfriStay" className="h-10 w-auto" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
          </Link>

          <h1 className="font-heading font-bold text-3xl text-dark mb-2">Créer un compte</h1>
          <p className="text-gray-500 text-sm mb-8">
            Remplissez les informations ci-dessous pour commencer votre aventure.
          </p>

          {/* Social Signup */}
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
            S&apos;inscrire avec Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-medium">ou par e-mail</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Prénom</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Nom</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Adresse e-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Téléphone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+225 XX XX XX XX"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-dark uppercase tracking-wide mb-2">Mot de passe</label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-1">Minimum 8 caractères</p>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 pt-1">
              <input type="checkbox" id="terms" className="mt-1 accent-primary" required />
              <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                J&apos;accepte les <a href="#" className="text-primary font-medium">Conditions d&apos;utilisation</a> et la <a href="#" className="text-primary font-medium">Politique de confidentialité</a> d&apos;AfriStay.
              </label>
            </div>

            {/* Submit */}
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
            <Link href="/login" className="font-bold text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
