"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/recherche?destination=${encodeURIComponent(value)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3">
      <div className="flex items-center bg-white rounded-full shadow-card px-4 py-3 gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <Search size={16} className="text-white" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Où allez-vous ?"
          className="flex-1 bg-transparent text-dark placeholder:text-muted text-sm outline-none font-body"
        />
      </div>
    </form>
  );
}
