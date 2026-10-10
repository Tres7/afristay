import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  className?: string;
}

const SIZES = { sm: "text-lg", md: "text-[22px]", lg: "text-3xl" };

/** Le « A » orange de la charte (dégradé ambre → orange brûlé). */
export function LettreA() {
  return (
    <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(160deg, #FBBF24 0%, #F59E0B 45%, #C2410C 100%)" }}>
      A
    </span>
  );
}

/** Logotype Kwa-Ba : « KWA-BA », lettres vert profond (blanches sur fond sombre) et deux A orange. */
export function Logotype({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("font-heading font-extrabold tracking-[0.04em] leading-none select-none", inverted ? "text-white" : "text-primary dark:text-white", className)}>
      KW<LettreA />-B<LettreA />
    </span>
  );
}

export default function Logo({ size = "md", inverted = false, className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex-shrink-0 inline-flex items-center", className)} aria-label="Kwa-Ba — accueil">
      <Logotype inverted={inverted} className={SIZES[size]} />
    </Link>
  );
}
