import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  rating: number;
  count: number;
  /** compact : « ★ 4,8 » ; full : « ★ 4,8 (12 avis) » */
  variant?: "compact" | "full";
  className?: string;
}

/** Note issue des avis vérifiés ; « Nouveau » tant qu'aucun voyageur n'a évalué le logement. */
export default function RatingBadge({ rating, count, variant = "compact", className }: RatingBadgeProps) {
  if (count === 0) {
    return (
      <span className={cn("inline-flex items-center text-[11px] font-bold uppercase tracking-wide text-secondary bg-secondary/10 px-2 py-0.5 rounded-full", className)}>
        Nouveau
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Note ${rating.toFixed(1)} sur 5, ${count} avis`}>
      <Star size={13} className="fill-accent text-accent" />
      <span className="text-xs font-bold text-dark">{rating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      {variant === "full" && <span className="text-xs text-muted">({count} avis)</span>}
    </span>
  );
}
