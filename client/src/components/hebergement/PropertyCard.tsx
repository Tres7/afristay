import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Hebergement } from "@/types/api/models";
import FavoriteButton from "@/components/hebergement/FavoriteButton";
import RatingBadge from "@/components/avis/RatingBadge";
import { FALLBACK_IMAGE, TYPE_LABELS, formatPrice } from "@/lib/utils";

interface PropertyCardProps {
  property: Hebergement;
  query?: string;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

export default function PropertyCard({ property, query = "", onFavoriteChange }: PropertyCardProps) {
  return (
    <Link
      href={`/hebergements/${property.id}${query}`}
      className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden flex flex-col h-full"
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={property.image_url || FALLBACK_IMAGE}
          alt={property.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-dark shadow-sm">
          {TYPE_LABELS[property.type] ?? property.type}
        </span>
        <FavoriteButton
          hebergementId={property.id}
          initial={property.is_favorite}
          onChange={onFavoriteChange}
          className="absolute top-3 right-3"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-heading font-semibold text-dark text-[15px] leading-snug line-clamp-1">{property.name}</h3>
          <RatingBadge rating={property.rating} count={property.review_count} className="flex-shrink-0" />
        </div>
        <div className="flex items-center gap-1 mt-1 text-gray-500">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="text-xs truncate">{property.location ? `${property.location}, ` : ""}{property.city}</span>
        </div>
        <p className="mt-auto pt-3 text-sm">
          <span className="font-heading font-bold text-primary">{formatPrice(property.price_per_night)}</span>
          <span className="text-gray-400 text-xs"> / nuit</span>
        </p>
      </div>
    </Link>
  );
}
