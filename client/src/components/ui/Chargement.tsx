"use client";

import { useTranslations } from "next-intl";

/** « Chargement... » / « Loading... » */
export default function Chargement() {
  return <>{useTranslations("commun")("chargement")}</>;
}
