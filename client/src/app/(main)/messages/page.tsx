import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { conversations } from "@/lib/mockData";

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-heading font-bold text-dark text-2xl mb-6">Messages</h1>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card p-16 flex flex-col items-center gap-4 border border-light text-center max-w-lg mx-auto mt-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <MessageCircle size={36} className="text-primary" />
            </div>
            <p className="text-dark font-heading font-bold text-xl">Aucune conversation</p>
            <p className="text-muted text-base">Vous n'avez pas encore de messages. Réservez un hébergement de prestige pour contacter un hôte.</p>
            <Link href="/recherche" className="mt-4 bg-primary text-white font-heading font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-600 transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Explorer les hébergements
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="group flex items-center gap-5 bg-white rounded-2xl p-5 hover:bg-light/40 transition-all duration-300 border border-transparent hover:border-light"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-soft">
                    <span className="text-white font-heading font-bold text-xl">{conv.hostName[0]}</span>
                  </div>
                  {conv.isOnline && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-secondary rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="font-heading font-bold text-dark text-lg truncate group-hover:text-primary transition-colors">{conv.hostName}</p>
                    <p className="text-muted text-xs font-medium">
                      {new Date(conv.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className="text-primary text-sm font-medium mb-1 truncate">{conv.propertyName}</p>
                  <p className="text-muted text-sm truncate">{conv.lastMessage}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
