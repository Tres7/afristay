import Link from "next/link";
import Logo from "@/components/layout/Logo";
import GererCookiesBouton from "@/components/legal/GererCookiesBouton";

const COLUMNS = [
  {
    title: "Découvrir",
    links: [
      { href: "/recherche", label: "Hébergements" },
      { href: "/decouvrir", label: "Expériences" },
      { href: "/recherche?sort=note", label: "Les mieux notés" },
      { href: "/transfert", label: "Transfert aéroport" },
      { href: "/together", label: "Voyager à plusieurs" },
      { href: "/concierge", label: "Concierge IA" },
    ],
  },
  {
    title: "Hôtes",
    links: [
      { href: "/hote", label: "Devenir hôte" },
      { href: "/hote/espace", label: "Espace hôte" },
    ],
  },
  {
    title: "Assistance",
    links: [
      { href: "/profil/aide", label: "Centre d'aide" },
      { href: "/remboursement", label: "Annulation et remboursement" },
    ],
  },
];

const LEGAL = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/confidentialite", label: "Confidentialité (RGPD)" },
  { href: "/cookies", label: "Politique cookies" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="text-gray-600 text-sm mt-3 max-w-xs leading-relaxed">
              Réservez des hébergements authentiques en Afrique et payez par Mobile Money ou carte.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-heading font-bold text-dark text-sm mb-3">{col.title}</h2>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-gray-600 hover:text-primary transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} Kwa-Ba. Tous droits réservés.</p>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {LEGAL.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-gray-600 hover:text-primary underline-offset-2 hover:underline">{l.label}</Link></li>
              ))}
              <li><GererCookiesBouton className="text-gray-600 hover:text-primary underline-offset-2 hover:underline" /></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
