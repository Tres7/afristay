import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link
      href={`/hebergements/${property.id}`}
      className="flex gap-3 bg-white rounded-card shadow-card p-3 active:scale-[0.98] transition-transform"
    >
      {/* Image placeholder */}
      <div className="w-24 h-24 rounded-[8px] bg-light flex-shrink-0 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-2xl">🏠</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-dark text-sm leading-tight truncate">
          {property.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <MapPin size={11} className="text-muted flex-shrink-0" />
          <span className="text-muted text-xs truncate">
            {property.location}, {property.city}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Star size={12} className="text-accent fill-accent" />
          <span className="text-dark text-xs font-medium">{property.rating}</span>
          <span className="text-muted text-xs">({property.reviews} avis)</span>
        </div>
        <div className="mt-2">
          <span className="text-primary font-heading font-bold text-base">
            {property.price} €
          </span>
          <span className="text-muted text-xs">/nuit</span>
        </div>
      </div>
    </Link>
  );
}
