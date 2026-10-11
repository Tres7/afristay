import { Bath, Check, CircleParking, CookingPot, Dumbbell, Snowflake, Trees, Waves, Wifi, type LucideIcon } from "lucide-react";
import { selon } from "@/lib/utils";

const EQUIPEMENTS: [string, string, string, LucideIcon][] = [
  ["piscine", "Piscine", "Swimming pool", Waves],
  ["wifi", "WiFi", "Wi-Fi", Wifi],
  ["clim", "Climatisation", "Air conditioning", Snowflake],
  ["parking", "Parking", "Parking", CircleParking],
  ["cuisine", "Cuisine", "Kitchen", CookingPot],
  ["jardin", "Jardin", "Garden", Trees],
  ["gym", "Salle de sport", "Gym", Dumbbell],
  ["spa", "Spa", "Spa", Bath],
];

/** Équipements, libellés dans la langue courante. */
export const AMENITIES: Record<string, { label: string; Icone: LucideIcon }> = Object.fromEntries(
  EQUIPEMENTS.map(([id, fr, en, Icone]) => [id, { Icone, get label() { return selon({ fr, en }); } }]),
);

interface AmenityBadgeProps {
  amenity: string;
}

export default function AmenityBadge({ amenity }: AmenityBadgeProps) {
  const { label, Icone } = AMENITIES[amenity] ?? { label: amenity, Icone: Check };
  return (
    <div className="flex items-center gap-2 bg-light-muted rounded-xl px-4 py-2.5">
      <Icone size={18} className="text-primary flex-shrink-0" aria-hidden />
      <span className="text-sm text-dark">{label}</span>
    </div>
  );
}
