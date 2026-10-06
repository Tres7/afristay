import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Pages réservées aux utilisateurs connectés (le centre d'aide reste public)
const PROTECTED = ["/profil", "/favoris", "/messages", "/reservation", "/hote/espace", "/backoffice"];
const PUBLIC_EXCEPTIONS = ["/profil/aide"];
// Pages d'authentification inutiles une fois connecté
const GUEST_ONLY = ["/login", "/register"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = !!req.auth && !req.auth.error;

  const isProtected =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !PUBLIC_EXCEPTIONS.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && isProtected) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // Back-office : administrateurs uniquement (l'API vérifie aussi le rôle)
  if (isLoggedIn && pathname.startsWith("/backoffice") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (isLoggedIn && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/profil/:path*",
    "/favoris",
    "/messages/:path*",
    "/reservation/:path*",
    "/hote/espace/:path*",
    "/backoffice/:path*",
    "/login",
    "/register",
  ],
};
