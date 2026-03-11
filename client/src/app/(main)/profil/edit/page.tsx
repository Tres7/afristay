"use client";

import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";

export default function EditProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    api.get("/v1/users/me/")
      .then((res) => {
        setForm({
          first_name: res.data.first_name ?? "",
          last_name: res.data.last_name ?? "",
          email: res.data.email ?? "",
          phone: res.data.phone ?? "",
        });
      })
      .catch(() => setError("Impossible de charger vos informations."))
      .finally(() => setFetching(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch("/v1/users/me/", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
      });
      await update();
      setSuccess(true);
    } catch {
      setError("Erreur lors de la mise à jour. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/profil"
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-dark">Modifier le profil</h1>
          <p className="text-muted text-sm mt-1">Mettez à jour vos informations personnelles</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-8 md:p-10">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
              Profil mis à jour avec succès !
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">Prénom</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-muted" />
                </div>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">Nom</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-muted" />
                </div>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">Adresse e-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-muted" />
              </div>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-muted cursor-not-allowed shadow-sm"
              />
            </div>
            <p className="text-xs text-muted ml-1 mt-1">L&apos;email ne peut pas être modifié.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">Numéro de téléphone</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone size={18} className="text-muted" />
              </div>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+229 XX XX XX XX"
                className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-light mt-8">
            <Link
              href="/profil"
              className="px-6 py-3 rounded-xl border border-gray-200 text-dark font-medium hover:bg-light transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-medium shadow-md hover:bg-primary-600 hover:shadow-lg transition-all disabled:opacity-70"
            >
              <Save size={18} />
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
