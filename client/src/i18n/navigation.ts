import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** À utiliser à la place de next/link et next/navigation : les liens gardent la langue courante (/en/…). */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
