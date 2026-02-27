import type { AmenityType } from "@/types";

const amenityConfig: Record<AmenityType, { label: string; emoji: string }> = {
  piscine: { label: "Piscine", emoji: "🏊" },
  wifi: { label: "WiFi", emoji: "📶" },
  clim: { label: "Clim", emoji: "❄️" },
  parking: { label: "Parking", emoji: "🅿️" },
  cuisine: { label: "Cuisine", emoji: "🍳" },
  jardin: { label: "Jardin", emoji: "🌿" },
  gym: { label: "Gym", emoji: "💪" },
  spa: { label: "Spa", emoji: "🛁" },
};

interface AmenityBadgeProps {
  amenity: AmenityType;
}

export default function AmenityBadge({ amenity }: AmenityBadgeProps) {
  const { label, emoji } = amenityConfig[amenity];
  return (
    <div className="flex flex-col items-center gap-1 bg-light rounded-[8px] px-4 py-2">
      <span className="text-xl">{emoji}</span>
      <span className="text-xs text-dark">{label}</span>
    </div>
  );
}
