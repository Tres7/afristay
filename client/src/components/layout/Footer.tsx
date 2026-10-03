"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear() || 2023;
  
  return (
    <footer className="bg-white border-t border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AfriStay" className="h-8 w-auto object-contain" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
            <p className="text-gray-500 text-sm font-medium">
              &copy; {currentYear} AfriStay. Tous droits réservés.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
