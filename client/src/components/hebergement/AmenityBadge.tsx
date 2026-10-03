export const AMENITIES: Record<string, { label: string; emoji: string }> = {
  piscine: { label: "Piscine", emoji: "🏊" },
  wifi: { label: "WiFi", emoji: "📶" },
  clim: { label: "Climatisation", emoji: "❄️" },
  parking: { label: "Parking", emoji: "🅿️" },
  cuisine: { label: "Cuisine", emoji: "🍳" },
  jardin: { label: "Jardin", emoji: "🌿" },
  gym: { label: "Salle de sport", emoji: "💪" },
  spa: { label: "Spa", emoji: "🛁" },
};

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
