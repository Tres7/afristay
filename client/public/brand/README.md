# Identité visuelle AfriStay

Fichiers générés à partir du composant `client/src/components/layout/Logo.tsx` (cotes mesurées dans le navigateur) :
icône Adinkra (trois losanges imbriqués) et mot « AfriStay » en Poppins Bold, interlettrage -0,025 em.

| Couleur | Hex | Usage |
|---|---|---|
| Orange | `#E67E22` | « Afri » (dégradé), icône |
| Ambre | `#F39C12` | fin du dégradé |
| Ardoise | `#2C3E50` | « Stay » sur fond clair |

## Fichiers

- `svg/` — vectoriels, texte converti en tracés (aucune police à installer) : à privilégier pour les retouches (Canva, Figma…) et l'impression.
  - `afristay-logo.svg` : fond clair · `afristay-logo-fond-sombre.svg` : « Stay » en blanc · `afristay-logo-blanc.svg` : tout blanc (photo, fond coloré) · `afristay-icone.svg` : icône seule.
- `png/` — fond transparent sauf mention :
  - logo horizontal en 500, 1000 et 2000 px de large (mêmes trois variantes) ;
  - icône seule en 16, 32, 48 (favicons), 180 (Apple), 192, 512 (Android) et 1024 px ;
  - `afristay-avatar-512/1024.png` : icône sur fond crème (photo de profil, icône d'application) ;
  - `afristay-partage-1200x630.png` : aperçu de lien (Open Graph), déjà référencé dans `app/layout.tsx`.

## Règles d'usage

- Ne pas déformer, recolorer ni ajouter d'effet (ombre, contour).
- Laisser autour du logo une marge au moins égale à la hauteur de l'icône ÷ 2.
- Taille minimale du logo horizontal : 120 px de large à l'écran.
