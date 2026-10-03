"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { ChatMessage, Conversation, Paginated } from "@/types/api/models";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get<Paginated<Conversation>>("/v1/conversations/")).data.results,
    select: (list) => list.find((c) => c.id === params.id),
  });

  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ["messages", params.id],
    queryFn: async () => (await api.get<Paginated<ChatMessage>>(`/v1/conversations/${params.id}/messages/`)).data.results,
    refetchInterval: 5_000,
    retry: false,
  });

  // Les messages sont marqués lus à la lecture : on rafraîchit les compteurs
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["conversations", "unread"] });
  }, [messages.length, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await api.post<ChatMessage>(`/v1/conversations/${params.id}/messages/`, { content });
      queryClient.setQueryData<ChatMessage[]>(["messages", params.id], (prev) => [...(prev ?? []), res.data]);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setInput("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Message non envoyé."));
    } finally {
      setSending(false);
    }
  };

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-heading font-bold text-xl text-dark">Conversation introuvable</p>
        <Link href="/messages" className="text-primary font-bold hover:underline">Retour aux messages</Link>
      </div>
    );
  }

  const other = conversation?.other_participant;
  const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "…";

  return (
    <div className="bg-light">
      <div className="max-w-4xl w-full mx-auto flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] bg-white md:border-x border-gray-100">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => router.push("/messages")} className="text-dark hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-full" aria-label="Retour aux messages">
            <ArrowLeft size={22} />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {other?.avatar_url ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{initials(otherName)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-dark truncate">{otherName}</p>
            {conversation?.hebergement_detail && (
              <Link href={`/hebergements/${conversation.hebergement_detail.id}`} className="text-muted text-xs font-medium truncate block hover:text-primary">
                {conversation.hebergement_detail.name}
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-6 space-y-3 bg-gray-50/60">
          {isLoading ? (
            <p className="text-center text-muted text-sm">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">Écrivez votre premier message à {otherName.split(" ")[0]}.</p>
          ) : (
            messages.map((msg, i) => {
              const showDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
              return (
                <div key={msg.id}>
                  {showDay && <p className="text-center text-[11px] font-semibold text-muted uppercase tracking-wide my-4">{dayLabel(msg.created_at)}</p>}
                  <div className={cn("flex", msg.is_own ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[82%] md:max-w-[65%] px-4 py-2.5 text-[15px] leading-relaxed",
                      msg.is_own ? "bg-primary text-white rounded-2xl rounded-br-sm" : "bg-white text-dark shadow-sm rounded-2xl rounded-bl-sm border border-gray-100"
                    )}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn("text-[11px] mt-1 text-right", msg.is_own ? "text-white/70" : "text-muted")}>
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {msg.is_own && msg.is_read && " · Lu"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="bg-white border-t border-gray-100 px-3 sm:px-6 py-3 flex items-end gap-2 sm:gap-3 flex-shrink-0"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Écrivez votre message…"
            rows={1}
            maxLength={2000}
            aria-label="Message"
            className="flex-1 resize-none max-h-32 bg-gray-50 border border-gray-200 focus:border-primary/40 focus:bg-white rounded-2xl px-4 py-3 text-base sm:text-sm text-dark outline-none placeholder:text-muted"
          />
          <button type="submit" disabled={!input.trim() || sending} aria-label="Envoyer" className="w-12 h-12 bg-primary rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-primary-600 transition-all active:scale-95 flex-shrink-0">
            <Send size={18} className="text-white ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
