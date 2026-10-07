import Link from "next/link";

export interface SectionLegale {
  id: string;
  titre: string;
  contenu: React.ReactNode;
}

interface LegalPageProps {
  titre: string;
  miseAJour: string;
  intro: React.ReactNode;
  sections: SectionLegale[];
}

const PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "Conditions générales d'utilisation" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/cookies", label: "Politique cookies" },
  { href: "/remboursement", label: "Annulation et remboursement" },
];

/** Gabarit des pages juridiques : sommaire, sections ancrées, liens entre documents. */
export default function LegalPage({ titre, miseAJour, intro, sections }: LegalPageProps) {
  return (
    <div className="bg-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <nav aria-label="Documents juridiques" className="sticky top-28 space-y-1 text-sm">
            <p className="font-heading font-bold text-dark mb-3">Informations légales</p>
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} className="block px-3 py-2 rounded-lg text-gray-600 hover:bg-white hover:text-dark">{p.label}</Link>
            ))}
          </nav>
        </aside>

        <article className="bg-white rounded-3xl shadow-card p-6 sm:p-10 min-w-0">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-dark">{titre}</h1>
          <p className="text-sm text-gray-600 mt-2">Dernière mise à jour : {miseAJour}</p>
          <div className="mt-6 text-gray-700 leading-relaxed space-y-3">{intro}</div>

          <nav aria-label="Sommaire" className="mt-8 p-5 rounded-2xl bg-gray-50">
            <p className="font-semibold text-dark text-sm mb-2">Sommaire</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-primary hover:underline">{s.titre}</a></li>
              ))}
            </ol>
          </nav>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-28" aria-labelledby={`${s.id}-titre`}>
              <h2 id={`${s.id}-titre`} className="font-heading font-bold text-xl text-dark mb-3">{i + 1}. {s.titre}</h2>
              <div className="text-gray-700 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:p-2 [&_th]:bg-gray-50 [&_td]:p-2 [&_td]:align-top [&_tr]:border-b [&_tr]:border-gray-100">
                {s.contenu}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

/**
 * Information à fournir par l'entreprise avant la mise en ligne (identité, contacts, hébergeur…).
 * Volontairement visible : aucune donnée légale n'est inventée.
 */
export function AC({ children }: { children: React.ReactNode }) {
  return <mark className="bg-amber-100 text-amber-900 px-1 rounded font-semibold">[À compléter : {children}]</mark>;
}

/** Règle proposée, à valider par le responsable (durées, montants, délais). */
export function AValider({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline">
      {children} <mark className="bg-blue-100 text-blue-900 px-1 rounded text-xs font-semibold whitespace-nowrap">proposition à valider</mark>
    </span>
  );
}
