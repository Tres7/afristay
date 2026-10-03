"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { Conversation, Paginated } from "@/types/api/models";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const { data: conversations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get<Paginated<Conversation>>("/v1/conversations/")).data.results,
    refetchInterval: 15_000,
  });

  return (
    <div className="bg-light min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading font-bold text-dark text-2xl mb-6">Messages</h1>

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
        ) : isError ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <p className="text-dark font-semibold mb-2">Impossible de charger vos messages.</p>
            <button onClick={() => refetch()} className="text-primary font-bold hover:underline">Réessayer</button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card p-8 sm:p-14 flex flex-col items-center gap-4 text-center max-w-lg mx-auto mt-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <MessageCircle size={36} className="text-primary" />
            </div>
            <p className="text-dark font-heading font-bold text-xl">Aucune conversation</p>
            <p className="text-muted">Depuis la fiche d&apos;un hébergement, cliquez sur « Contacter » pour écrire à son hôte.</p>
            <Link href="/recherche" className="mt-4 bg-primary text-white font-heading font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-600 transition-colors shadow-md">
              Explorer les hébergements
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const name = `${conv.other_participant.first_name} ${conv.other_participant.last_name}`.trim();
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="group flex items-center gap-4 bg-white rounded-2xl p-4 sm:p-5 transition-all border border-transparent hover:border-gray-200"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {conv.other_participant.avatar_url ? (
                      <img src={conv.other_participant.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-heading font-bold text-lg">{initials(name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2 mb-0.5">
                      <p className={cn("font-heading text-dark truncate group-hover:text-primary transition-colors", conv.unread_count ? "font-bold" : "font-semibold")}>{name}</p>
                      <p className="text-muted text-xs font-medium flex-shrink-0">{formatWhen(conv.last_message_at)}</p>
                    </div>
                    {conv.hebergement_detail && <p className="text-primary text-xs font-medium mb-0.5 truncate">{conv.hebergement_detail.name}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm truncate", conv.unread_count ? "text-dark font-medium" : "text-muted")}>
                        {conv.last_message ?? "Nouvelle conversation"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center flex-shrink-0">{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
