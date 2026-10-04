"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Phone, Video, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import type { MessagingConversation, MessagingMessage } from "@/types/api/messaging";

const CHAT_POLL_INTERVAL_MS = 4_000;

type ChatMessage = MessagingMessage & { pending?: boolean };

function errorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
  if (response?.status === 429) return "Vous envoyez trop de messages. Réessayez dans un instant.";
  return response?.data?.detail ?? "Le message n'a pas pu être envoyé.";
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;

  const [conversation, setConversation] = useState<MessagingConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Plus grand id de message confirmé par le serveur : curseur du polling
  const lastIdRef = useRef(0);

  // Ajoute des messages serveur sans doublon (un envoi peut revenir à la fois par le POST et par le polling)
  const mergeMessages = useCallback((incoming: MessagingMessage[]) => {
    if (incoming.length === 0) return;
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
    setMessages((prev) => {
      const known = new Set(prev.filter((m) => !m.pending).map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (fresh.length === 0) return prev;
      const confirmed = [...prev.filter((m) => !m.pending), ...fresh].sort((a, b) => a.id - b.id);
      return [...confirmed, ...prev.filter((m) => m.pending)];
    });
  }, []);

  const markAsRead = useCallback(() => {
    if (lastIdRef.current === 0) return;
    // Jusqu'au dernier message affiché, pas au dernier message en base
    api.post(`/v1/messaging/conversations/${conversationId}/read/`, { up_to_id: lastIdRef.current }).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    Promise.all([
      api.get(`/v1/messaging/conversations/${conversationId}/`),
      api.get(`/v1/messaging/conversations/${conversationId}/messages/`),
    ])
      .then(([convRes, msgRes]) => {
        setConversation(convRes.data);
        mergeMessages(msgRes.data.results);
        markAsRead();
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [conversationId, mergeMessages, markAsRead]);

  const pollNewMessages = useCallback(async () => {
    const res = await api.get(`/v1/messaging/conversations/${conversationId}/messages/`, {
      params: { after: lastIdRef.current },
    });
    const incoming: MessagingMessage[] = res.data.results;
    mergeMessages(incoming);
    if (incoming.some((m) => !m.is_own)) markAsRead();
  }, [conversationId, mergeMessages, markAsRead]);

  usePolling(pollNewMessages, CHAT_POLL_INTERVAL_MS, !loading && !notFound);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;
    setSendError("");

    // Affichage immédiat, remplacé par la version serveur à la réponse
    const tempId = -Date.now();
    setMessages((prev) => [...prev, {
      id: tempId, conversation_id: conversationId, sender_id: "", content,
      created_at: new Date().toISOString(), is_own: true, pending: true,
    }]);
    setInput("");

    try {
      const res = await api.post(`/v1/messaging/conversations/${conversationId}/messages/`, { content });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      mergeMessages([res.data]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      setSendError(errorMessage(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (notFound || !conversation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Conversation introuvable</p>
        <Link href="/messages" className="text-primary font-medium hover:underline">Retour aux messages</Link>
      </div>
    );
  }

  const other = conversation.other_participant;
  const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "Utilisateur";
  const initial = otherName[0];

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 min-h-0 bg-white md:border-x border-light shadow-sm">
        {/* Header */}
        <div className="bg-white border-b border-light px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => router.push("/messages")} className="text-dark hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-light">
              <ArrowLeft size={22} />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
              {other?.avatar_url ? (
                <img src={other.avatar_url} alt={otherName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-lg">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-dark text-lg truncate">{otherName}</p>
              <p className="text-muted text-xs font-medium truncate">
                {conversation.my_role === "host" ? "Voyageur" : "Hôte"}
                {conversation.hebergement && (
                  <>
                    {" • "}
                    <Link href={`/hebergements/${conversation.hebergement.id}`} className="hover:text-primary hover:underline">
                      {conversation.hebergement.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-light/50 p-1 rounded-2xl border border-gray-100">
            <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-dark/70 hover:text-primary transition-all shadow-sm hover:shadow">
              <Phone size={18} />
            </button>
            <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-dark/70 hover:text-primary transition-all shadow-sm hover:shadow">
              <Video size={18} />
            </button>
            <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-dark/70 hover:text-dark transition-all shadow-sm hover:shadow">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-6 bg-gray-50/50">
          {messages.length === 0 && (
            <p className="text-center text-muted text-sm py-12">
              Écrivez votre premier message à {otherName}.
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.is_own ? "justify-end" : "justify-start")}>
              {!msg.is_own && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 self-end shadow-sm mb-1">
                  <span className="text-white text-xs font-bold">{initial}</span>
                </div>
              )}
              <div className={cn(
                "max-w-[75%] md:max-w-[65%] px-5 py-3.5 text-[15px] leading-relaxed relative group",
                msg.is_own
                  ? "bg-primary text-white rounded-2xl rounded-br-sm shadow-md"
                  : "bg-white text-dark shadow-card rounded-2xl rounded-bl-sm border border-gray-100",
                msg.pending && "opacity-60"
              )}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={cn("flex items-center gap-1.5 mt-1.5", msg.is_own ? "justify-end" : "justify-start")}>
                  <p className={cn("text-[11px] font-medium", msg.is_own ? "text-white/70" : "text-muted/70")}>
                    {msg.pending
                      ? "Envoi..."
                      : new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-light px-4 md:px-6 py-4 flex-shrink-0 mt-auto">
          {sendError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 mb-3">{sendError}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={2000}
                placeholder="Écrivez votre message..."
                className="w-full bg-light border border-transparent focus:border-primary/20 focus:bg-white rounded-full pl-5 pr-12 py-3.5 text-sm text-dark outline-none placeholder:text-muted transition-all shadow-sm"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-primary-600 transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              <Send size={18} className="text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
