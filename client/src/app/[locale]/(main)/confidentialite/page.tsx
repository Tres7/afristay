import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import ContenuEn from "./en";
import ContenuFr from "./fr";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.titres");
  return { title: t("confidentialite") };
}

/** Page juridique : version française ou anglaise selon la langue (la version française fait foi). */
export default async function Page() {
  return (await getLocale()) === "en" ? <ContenuEn /> : <ContenuFr />;
}
