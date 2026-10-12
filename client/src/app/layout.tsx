/**
 * Les balises <html> et <body> sont rendues par app/[locale]/layout.tsx (site, FR ou EN)
 * et par app/backoffice/layout.tsx : ainsi un changement de langue reconstruit toute la page.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
