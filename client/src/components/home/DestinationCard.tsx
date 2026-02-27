import Link from "next/link";
import type { Destination } from "@/types";

interface DestinationCardProps {
  destination: Destination;
}

export default function DestinationCard({ destination }: DestinationCardProps) {
  return (
    <Link
      href={`/recherche?destination=${encodeURIComponent(destination.name)}`}
      className="relative rounded-card overflow-hidden aspect-square flex flex-col justify-end p-3 cursor-pointer active:scale-95 transition-transform"
      style={{ backgroundColor: destination.color }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="relative z-10">
        <p className="text-white/80 text-xs">{destination.count}+ hébergements</p>
        <p className="text-white font-heading font-bold text-base">{destination.name}</p>
      </div>
    </Link>
  );
}
