import type { Metadata } from "next";
import AdminShell from "@/components/backoffice/AdminShell";

export const metadata: Metadata = {
  title: "Back-office",
  robots: { index: false, follow: false },
};

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
