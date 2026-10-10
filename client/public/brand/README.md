# Identité visuelle Kwa-Ba

« Le monde vous accueille. »

## Couleurs
| Couleur | Code | Usage |
|---|---|---|
| Vert profond (Confiance) | `#0E4D47` | couleur principale (`primary`) |
| Orange (Énergie) | `#F59E0B` | les deux « A » du logo, étoiles, décors (`accent`) |
| Orange foncé | `#B45309` | boutons d'action avec texte blanc (`secondary`, contraste 5:1) |
| Crème (Simplicité) | `#F8F6F2` | fonds (`light`) |
| Gris anthracite (Modernité) | `#1F2937` | texte (`dark`) |

Police des titres : **Montserrat** (800 pour le logo), texte : Inter.

## Fichiers
- `kwaba-icone.svg` et `kwaba-icone-{16,32,48,180,192,512}.png` : pictogramme (le « A » au soleil levant sur fond vert) — favicon, icône Apple et application ;
- `kwaba-logo.png` / `kwaba-logo-blanc.png` : logotype « KWA-BA » sur fond transparent (clair / sombre) ;
- `kwaba-logo-email.png` : logotype sur fond blanc, intégré aux emails ;
- `kwaba-partage-1200x630.png` : aperçu des liens partagés (Open Graph).

Sur le site, le logotype est dessiné en texte par `components/layout/Logo.tsx` (net à toutes les tailles) et le pictogramme par `components/layout/IconeKwaba.tsx`. Les PNG sont générés à partir de ces mêmes dessins.
