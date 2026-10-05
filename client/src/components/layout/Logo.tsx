import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  className?: string;
}

const SIZES = { sm: { icon: 24, text: "text-lg" }, md: { icon: 30, text: "text-[22px]" }, lg: { icon: 44, text: "text-3xl" } };

/** Marque AfriStay : losanges Adinkra imbriqués + wordmark. */
export default function Logo({ size = "md", inverted = false, className }: LogoProps) {
  const gradientId = useId();
  const { icon, text } = SIZES[size];

  return (
    <Link href="/" className={cn("flex-shrink-0 inline-flex items-center gap-2 group", className)} aria-label="AfriStay — accueil">
      <svg width={icon} height={icon} viewBox="0 0 30 30" fill="none" className="flex-shrink-0 transition-transform duration-500 group-hover:rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="30" y2="30">
            <stop stopColor={inverted ? "#FFFFFF" : "#E67E22"} />
            <stop offset="1" stopColor={inverted ? "#FDF7F2" : "#F39C12"} />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="24" height="24" rx="3" transform="rotate(45 15 15)" fill={`url(#${gradientId})`} opacity="0.15" />
        <rect x="6" y="6" width="18" height="18" rx="2" transform="rotate(45 15 15)" stroke={`url(#${gradientId})`} strokeWidth="1.5" fill="none" />
        <rect x="10" y="10" width="10" height="10" rx="1.5" transform="rotate(45 15 15)" fill={`url(#${gradientId})`} />
      </svg>
      <span className={cn("font-heading font-black tracking-tight leading-none select-none", text)}>
        {inverted ? (
          <span className="text-white">AfriStay</span>
        ) : (
          <>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #E67E22 0%, #F39C12 100%)" }}>
              Afri
            </span>
            <span className="text-[#2C3E50] dark:text-white group-hover:text-primary transition-colors duration-300">Stay</span>
          </>
        )}
      </span>
    </Link>
  );
}
