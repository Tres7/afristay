import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { langueDe, metadataPage } from "@/lib/seo";
import ContenuEn from "./en";
import ContenuFr from "./fr";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = langueDe((await params).locale);
  const t = await getTranslations({ locale, namespace: "legal.titres" });
  return metadataPage({ locale, chemin: "/confidentialite", titre: t("confidentialite") });
}

/** Page juridique : version française ou anglaise selon la langue (la version française fait foi). */
export default async function Page() {
  return (await getLocale()) === "en" ? <ContenuEn /> : <ContenuFr />;
}
