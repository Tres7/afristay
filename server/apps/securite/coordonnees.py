"""Détection des coordonnées dans un texte libre (messages, annonces) : anti-contournement de la plateforme.

Avant comme après une réservation, voyageurs et hôtes échangent par la messagerie Kwa-Ba : un hôte ne doit pas
pouvoir proposer un arrangement en dehors du site (paiement en espèces, sans protection ni commission).

- Masqués : numéros de téléphone (chiffres, y compris espacés ou écrits en toutes lettres), emails (même
  déguisés : « nom arobase gmail point com »), liens et adresses de sites, comptes de réseaux sociaux (@nom).
- Signalés sans être masqués (une simple mention est souvent innocente) : applications de messagerie,
  paiement en espèces ou hors du site.

Les dates (12/10/2026) et les montants (150 000 FCFA) ne sont pas pris pour des numéros.
"""
import re
from dataclasses import dataclass

MASQUE = '[coordonnées masquées]'
DOMAINES_AUTORISES = {'kwa-ba.com', 'www.kwa-ba.com'}

_MOTS_CHIFFRES = (r"z[ée]ro|zero|un|une|one|deux|two|trois|three|quatre|four|cinq|five|six|sept|seven|huit|eight|"
                  r"neuf|nine|dix|ten|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|"
                  r"soixante|cent")
_TLD = r"com|fr|net|org|tg|bj|ci|sn|bf|gh|ng|me|io|ly|app|link|info|biz|online|shop|store"

_URL = re.compile(r"(?i)\b(?:https?://|www\.)[^\s<>\"']+")
# Extension en minuscules : « ok.Me voici » (début de phrase collé au point) n'est pas un site
_DOMAINE = re.compile(rf"\b[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)*\.(?:{_TLD})\b(?:/[^\s<>\"']*)?")
_EMAIL = re.compile(r"(?i)\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_EMAIL_DEGUISE = re.compile(
    rf"(?i)\b[\w.+-]+\s*(?:\(at\)|\[at\]|\(@\)|\barobase\b|\bat\b)\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b|\bpoint\b)\s*(?:{_TLD})\b")
_RESEAU = re.compile(r"(?<![\w@.])@[A-Za-z][\w.]{2,29}\b")
# Groupes de chiffres séparés par un seul caractère (espace, point, tiret, barre) : 90 12 34 56, +228-90.12.34.56
_TELEPHONE = re.compile(r"(?<![\w])(?:\+|00)?\(?\d{1,4}\)?(?:[ .\-/]?\(?\d{1,5}\)?){2,}(?![\w])")
_TELEPHONE_LETTRES = re.compile(rf"(?i)\b(?:(?:{_MOTS_CHIFFRES})(?:[\s,\-]+|$)){{6,}}")
_DATE = re.compile(r"^\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}$")
_MONTANT_APRES = re.compile(r"(?i)^\s*(?:f\b|fcfa|cfa|xof|francs?|€|eur|euros?|\$|usd|m2|m²|km)")

_APPLICATIONS = re.compile(r"(?i)\b(whats\s?app|watsap+|wassap+|wa\.me|telegram|signal|messenger|viber|imo|snap(?:chat)?|"
                           r"instagram|insta|facebook|tik\s?tok)\b")
_HORS_SITE = re.compile(r"(?i)\b(esp[eè]ces|cash|en liquide|payer? (?:directement|sur place|en main propre)|"
                        r"hors (?:du )?site|en dehors (?:du site|de kwa-?ba)|sans passer par (?:le site|kwa-?ba))\b")


@dataclass
class Trouvaille:
    type: str     # telephone, email, lien, reseau, application, hors_site
    valeur: str


def _chiffres(texte: str) -> int:
    return sum(c.isdigit() for c in texte)


def analyser(texte: str) -> tuple[str, list[Trouvaille]]:
    """Renvoie le texte avec les coordonnées masquées, et tout ce qui a été trouvé (masqué ou simplement signalé)."""
    trouvailles: list[Trouvaille] = []

    def remplacer(type_):
        def _(m):
            valeur = m.group(0)
            if type_ == 'lien' and valeur.lower().rstrip('/.,;') in DOMAINES_AUTORISES:
                return valeur
            trouvailles.append(Trouvaille(type_, valeur.strip()))
            return MASQUE
        return _

    texte = texte or ''
    # Ordre : emails avant liens (le domaine d'un email est aussi un domaine), liens avant téléphones
    texte = _EMAIL.sub(remplacer('email'), texte)
    texte = _EMAIL_DEGUISE.sub(remplacer('email'), texte)
    texte = _URL.sub(remplacer('lien'), texte)
    texte = _DOMAINE.sub(remplacer('lien'), texte)
    texte = _RESEAU.sub(remplacer('reseau'), texte)

    def telephone(m):
        valeur = m.group(0)
        n = _chiffres(valeur)
        suite = m.string[m.end():m.end() + 12]
        if n < 8 or n > 15 or _DATE.match(valeur.strip()) or _MONTANT_APRES.match(suite):
            return valeur
        trouvailles.append(Trouvaille('telephone', valeur.strip()))
        return MASQUE

    texte = _TELEPHONE.sub(telephone, texte)
    texte = _TELEPHONE_LETTRES.sub(lambda m: (trouvailles.append(Trouvaille('telephone', m.group(0).strip())), MASQUE + ' ')[1], texte)

    for motif, type_ in ((_APPLICATIONS, 'application'), (_HORS_SITE, 'hors_site')):
        trouvailles += [Trouvaille(type_, m.group(0)) for m in motif.finditer(texte)]
    return re.sub(r'[ \t]{2,}', ' ', texte).strip(), trouvailles


def masquees(trouvailles: list[Trouvaille]) -> bool:
    """Au moins une coordonnée a été masquée (les mentions seulement signalées ne comptent pas)."""
    return any(t.type in ('telephone', 'email', 'lien', 'reseau') for t in trouvailles)
