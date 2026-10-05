"""Validation et normalisation des photos d'hébergement envoyées par les hôtes."""
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024        # 10 Mo
MAX_SOURCE_PIXELS = 40_000_000             # garde-fou contre les « bombes de décompression »
MAX_DIMENSION = 2000                       # côté le plus long après redimensionnement
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
JPEG_QUALITY = 82


class InvalidPhoto(ValueError):
    pass


def normalize_photo(uploaded_file) -> tuple[ContentFile, int, int]:
    """Vérifie le fichier puis renvoie un JPEG redimensionné, orienté et sans métadonnées (EXIF/GPS)."""
    if uploaded_file.size > MAX_UPLOAD_BYTES:
        raise InvalidPhoto("La photo dépasse 10 Mo.")

    try:
        with Image.open(uploaded_file) as probe:
            fmt = probe.format
            width, height = probe.size
            probe.verify()  # détecte les fichiers tronqués ou corrompus
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise InvalidPhoto("Ce fichier n'est pas une image valide.")

    if fmt not in ALLOWED_FORMATS:
        raise InvalidPhoto("Formats acceptés : JPEG, PNG ou WebP.")
    if width * height > MAX_SOURCE_PIXELS:
        raise InvalidPhoto("Image trop grande (40 mégapixels maximum).")
    if min(width, height) < 400:
        raise InvalidPhoto("Image trop petite : 400 pixels minimum de côté.")

    # verify() rend l'image inutilisable : on la rouvre pour la traiter
    uploaded_file.seek(0)
    with Image.open(uploaded_file) as img:
        img = ImageOps.exif_transpose(img)      # applique la rotation du téléphone
        if img.mode != 'RGB':
            background = Image.new('RGB', img.size, (255, 255, 255))
            rgba = img.convert('RGBA')
            background.paste(rgba, mask=rgba.split()[-1])
            img = background
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

        buffer = BytesIO()
        # Pas de paramètre exif : les métadonnées (position GPS, appareil) ne sont pas recopiées
        img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
        return ContentFile(buffer.getvalue()), img.width, img.height
