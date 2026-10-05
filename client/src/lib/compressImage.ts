const MAX_DIMENSION = 2000;
const QUALITY = 0.85;
// En dessous, l'image part telle quelle (le serveur la normalise de toute façon)
const SKIP_BELOW_BYTES = 800 * 1024;

/**
 * Réduit une photo dans le navigateur avant l'envoi (moins de données sur les connexions mobiles lentes).
 * Renvoie le fichier d'origine si le navigateur ne sait pas la décoder (ex. HEIC) ou si la réduction n'apporte rien.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= SKIP_BELOW_BYTES || typeof createImageBitmap === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation : applique la rotation EXIF du téléphone
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Fond blanc : les zones transparentes d'un PNG ne deviennent pas noires en JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
