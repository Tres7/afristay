"use client";

import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Save } from "lucide-react";
import { useState } from "react";

export default function EditProfilePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      alert("Profil mis à jour avec succès !");
    }, 1500);
  };

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
        <div className="flex flex-col md:flex-row gap-10">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 md:w-1/3">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-soft">
                <img 
                  src="https://i.pravatar.cc/150?u=a042581f4e29026704d" 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                className="absolute bottom-1 right-1 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-600 transition-colors"
                aria-label="Changer la photo"
              >
                <Camera size={18} />
              </button>
            </div>
            <p className="text-xs text-muted text-center">
              Formats acceptés : JPG, PNG. Max 5MB.
            </p>
          </div>

          {/* Form Section */}
          <div className="md:w-2/3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">
                    Prénom
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-muted" />
                    </div>
                    <input
                      type="text"
                      defaultValue="John"
                      className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">
                    Nom
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-muted" />
                    </div>
                    <input
                      type="text"
                      defaultValue="Doe"
                      className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-muted" />
                  </div>
                  <input
                    type="email"
                    defaultValue="john.doe@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone size={18} className="text-muted" />
                  </div>
                  <input
                    type="tel"
                    defaultValue="+33 6 12 34 56 78"
                    className="w-full pl-11 pr-4 py-3 bg-light border border-transparent rounded-xl text-dark focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark mb-1.5 ml-1">
                  Adresse postale
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin size={18} className="text-muted" />
                  </div>
                  <input
                    type="text"
                    defaultValue="123 Avenue des Champs, Abidjan"
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
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-medium shadow-md hover:bg-primary-600 hover:shadow-lg transition-all disabled:opacity-70 disabled:hover:transform-none"
                >
                  <Save size={18} />
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
