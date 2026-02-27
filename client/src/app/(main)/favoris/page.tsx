import { Heart, Search } from "lucide-react";
import PropertyCard from "@/components/hebergement/PropertyCard";
import { properties } from "@/lib/mockData";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FavorisPage() {
  const favorites = properties.filter((p) => p.isFavorite);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10 flex items-center gap-4">
        <Link 
          href="/profil" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-dark">Mes Favoris</h1>
          <p className="text-muted text-sm mt-1">Les hébergements que vous avez sauvegardés pour plus tard</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 md:p-8 min-h-[50vh]">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-6">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary/40">
              <Heart size={40} />
            </div>
            <div className="text-center max-w-sm">
              <h2 className="font-heading font-bold text-xl text-dark mb-2">Aucun favori pour l'instant</h2>
              <p className="text-muted text-sm mb-8 leading-relaxed">
                Explorez nos hébergements et cliquez sur l'icône cœur pour sauvegarder vos coups de cœur ici.
              </p>
              <Link
                href="/recherche"
                className="inline-flex items-center gap-2 bg-primary text-white font-medium px-8 py-3.5 rounded-xl shadow-md hover:bg-primary-600 hover:shadow-lg transition-all"
              >
                <Search size={18} />
                Explorer les hébergements
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
