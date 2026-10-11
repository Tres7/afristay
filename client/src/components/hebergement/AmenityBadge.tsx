import { selon } from "@/lib/utils";

const EQUIPEMENTS: [string, string, string, string][] = [
  ["piscine", "Piscine", "Swimming pool", "🏊"],
  ["wifi", "WiFi", "Wi-Fi", "📶"],
  ["clim", "Climatisation", "Air conditioning", "❄️"],
  ["parking", "Parking", "Parking", "🅿️"],
  ["cuisine", "Cuisine", "Kitchen", "🍳"],
  ["jardin", "Jardin", "Garden", "🌿"],
  ["gym", "Salle de sport", "Gym", "💪"],
  ["spa", "Spa", "Spa", "🛁"],
];

/** Équipements, libellés dans la langue courante. */
export const AMENITIES: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  EQUIPEMENTS.map(([id, fr, en, emoji]) => [id, { emoji, get label() { return selon({ fr, en }); } }]),
);

interface AmenityBadgeProps {
  amenity: string;
}

export default function AmenityBadge({ amenity }: AmenityBadgeProps) {
  const { label, emoji } = AMENITIES[amenity] ?? { label: amenity, emoji: "✓" };
  return (
    <div className="flex items-center gap-2 bg-light-muted rounded-xl px-4 py-2.5">
      <span className="text-lg" aria-hidden>{emoji}</span>
      <span className="text-sm text-dark">{label}</span>
    </div>
  );
}
