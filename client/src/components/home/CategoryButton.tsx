import Link from "next/link";
import { Hotel, Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "hotel", label: "Hôtels", icon: Hotel, color: "bg-primary" },
  { id: "appartement", label: "Apparts", icon: Building2, color: "bg-secondary" },
  { id: "villa", label: "Villas", icon: Home, color: "bg-accent" },
];

export default function CategoryButtons() {
  return (
    <div className="flex justify-around px-6 py-2">
      {categories.map(({ id, label, icon: Icon, color }) => (
        <Link
          key={id}
          href={`/recherche?type=${id}`}
          className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-card",
              color
            )}
          >
            <Icon size={26} className="text-white" />
          </div>
          <span className="text-dark text-xs font-medium">{label}</span>
        </Link>
      ))}
    </div>
  );
}
