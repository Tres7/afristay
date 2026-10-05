import Link from "next/link";
import Logo from "@/components/layout/Logo";

const COLUMNS = [
  {
    title: "Découvrir",
    links: [
      { href: "/recherche", label: "Hébergements" },
      { href: "/decouvrir", label: "Expériences" },
      { href: "/recherche?sort=note", label: "Les mieux notés" },
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
      { href: "/profil/aide#annulation", label: "Annulation" },
      { href: "/profil/aide#confidentialite", label: "Confidentialité" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="text-gray-500 text-sm mt-3 max-w-xs leading-relaxed">
              Réservez des hébergements authentiques en Afrique et payez par Mobile Money ou carte.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-heading font-bold text-dark text-sm mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-gray-500 hover:text-primary transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-10 pt-6 border-t border-gray-100">
          &copy; {new Date().getFullYear()} AfriStay. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
