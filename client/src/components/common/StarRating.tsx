import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviews?: number;
  size?: number;
}

export default function StarRating({ rating, reviews, size = 14 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <Star size={size} className="text-accent fill-accent" />
      <span className="text-dark font-medium text-sm">{rating}</span>
      {reviews !== undefined && (
        <span className="text-muted text-xs">({reviews} avis)</span>
      )}
    </div>
  );
}
