import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SubPageHeader({ title, subtitle, back = "/profil" }: { title: string; subtitle?: string; back?: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <Link href={back} aria-label="Retour" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light-muted transition-colors flex-shrink-0">
        <ArrowLeft size={20} />
      </Link>
      <div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-dark">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
