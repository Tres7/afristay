"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  hebergementId: string;
  initial: boolean;
  onChange?: (isFavorite: boolean) => void;
  variant?: "icon" | "button";
  className?: string;
}

export default function FavoriteButton({ hebergementId, initial, onChange, variant = "icon", className }: FavoriteButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, setPending] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;

    const next = !isFavorite;
    setIsFavorite(next);
    setPending(true);
    try {
      if (next) await api.post("/v1/favoris/", { hebergement: hebergementId });
      else await api.delete(`/v1/favoris/${hebergementId}/`);
      onChange?.(next);
      toast.success(next ? "Ajouté à vos favoris" : "Retiré de vos favoris");
    } catch {
      setIsFavorite(!next);
      toast.error("Impossible de mettre à jour vos favoris.");
    } finally {
      setPending(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isFavorite}
        className={cn(
          "flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm text-dark transition-colors hover:bg-light-muted",
          className
        )}
      >
        <Heart size={15} className={isFavorite ? "text-red-500 fill-red-500" : "text-dark"} />
        <span className="hidden sm:inline">{isFavorite ? "Sauvegardé" : "Sauvegarder"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={isFavorite}
      className={cn(
        "p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-colors hover:bg-white",
        isFavorite ? "text-red-500" : "text-gray-500 hover:text-red-500",
        className
      )}
    >
      <Heart size={16} className={isFavorite ? "fill-red-500" : ""} />
    </button>
  );
}
