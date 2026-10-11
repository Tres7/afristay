# Langues : français et anglais

Le site existe en français (par défaut) et en anglais, avec la bibliothèque **next-intl**.
Code : `client/src/i18n/`, `client/messages/{fr,en}.json`, `client/src/middleware.ts`.

## Adresses

| Langue | Adresse | Exemple |
|---|---|---|
| Français | sans préfixe | `kwa-ba.com/recherche` |
| Anglais | préfixe `/en` | `kwa-ba.com/en/recherche` |

- Première visite : la langue du navigateur décide (un navigateur en anglais est redirigé vers `/en/…`).
- Ensuite, le choix de l'utilisateur est mémorisé dans le cookie `NEXT_LOCALE` (1 an, déclaré dans la politique cookies).
- Sélecteur FR / EN : barre de navigation, menu mobile, pied de page, et `Profil → Langue & région`.
- Google indexe les deux versions (balises `hreflang` ajoutées par next-intl).
- Le back-office (`/backoffice`) reste en français.

## Écrire un texte

Jamais de texte en dur dans un composant : ajouter la clé dans **les deux** fichiers `messages/fr.json` et `messages/en.json`, puis :

```tsx
import { useTranslations } from "next-intl";

const t = useTranslations("monEspace");
<p>{t("bonjour", { nom })}</p>                              // "Bonjour {nom}"
<p>{t("nuits", { nombre })}</p>                             // "{nombre, plural, one {# nuit} other {# nuits}}"
<p>{t.rich("cgu", { lien: (x) => <Link href="/cgu">{x}</Link> })}</p>   // "J'accepte les <lien>CGU</lien>"
```

- Liens et navigation : importer `Link`, `useRouter`, `usePathname`, `redirect` depuis **`@/i18n/navigation`** (et non `next/link` ou `next/navigation`), pour garder la langue.
- Dates et prix : `formatDate` et `formatPrice` (`lib/utils.ts`) suivent déjà la langue. Hors composant React, `selon({ fr: "…", en: "…" })` choisit le texte de la langue courante.
- Libellés partagés : `TYPE_LABELS`, `ROLE_LABELS` (`lib/utils.ts`), `AMENITIES` (équipements), `CAUSES` et `PAYS` (`lib/give.ts`).
- Repérer un texte oublié : `bash scripts/textes-a-traduire.sh src/chemin/fichier.tsx`.
- Les deux fichiers doivent avoir exactement les mêmes clés : une clé absente s'affiche telle quelle (« monEspace.bonjour ») et next-intl écrit une erreur dans les journaux.

## Pages juridiques

Chaque page (`cgu`, `confidentialite`, `cookies`, `mentions-legales`, `remboursement`) a deux fichiers : `fr.tsx` et `en.tsx`, choisis par `page.tsx`.
La version anglaise précise que **la version française fait foi**. Toute modification juridique doit être faite dans les deux fichiers ; la traduction anglaise est à faire relire.

## Concierge IA

Le navigateur envoie la langue (`Accept-Language`). Le serveur (`apps/concierge/services.py`) demande alors au modèle de répondre en anglais et traduit ses messages d'étape et d'erreur.

## Pas encore traduit (étape 2)

- Les **emails** (codes de vérification, confirmations, reçus, Give…) : toujours en français. Il faudra enregistrer la langue sur le profil de l'utilisateur et créer les gabarits anglais.
- Les **messages d'erreur de l'API** (« Réservation introuvable »…) : en français. Le site affiche une traduction anglaise pour la plupart des cas courants, mais un message précis du serveur peut apparaître en français.
- Les **contenus saisis par les utilisateurs** (descriptions des logements, avis, messages) restent dans leur langue d'origine.
