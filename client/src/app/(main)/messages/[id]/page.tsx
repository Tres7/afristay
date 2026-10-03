"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Phone, Video, MoreVertical } from "lucide-react";
import { conversations } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conv = conversations.find((c) => c.id === params.id);
  const [messages, setMessages] = useState<Message[]>(conv?.messages || []);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conv) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Conversation introuvable</p>
      </div>
    );
  }

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: "Moi",
      content: input.trim(),
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 min-h-0 bg-white md:border-x border-light shadow-sm">
        {/* Header */}
        <div className="bg-white border-b border-light px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-dark hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-light">
              <ArrowLeft size={22} />
            </button>
            <div className="relative flex-shrink-0 cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">{conv.hostName[0]}</span>
              </div>
              {conv.isOnline && (
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-dark text-lg truncate cursor-pointer hover:text-primary transition-colors">{conv.hostName}</p>
              <p className="text-muted text-xs font-medium">
                {conv.propertyName} • {conv.isOnline ? <span className="text-green-600 font-semibold">En ligne</span> : "Hors ligne"}
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
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.isOwn ? "justify-end" : "justify-start")}>
              {!msg.isOwn && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 self-end shadow-sm mb-1">
                  <span className="text-white text-xs font-bold">{conv.hostName[0]}</span>
                </div>
              )}
              <div className={cn(
                "max-w-[75%] md:max-w-[65%] px-5 py-3.5 text-[15px] leading-relaxed relative group",
                msg.isOwn
                  ? "bg-primary text-white rounded-2xl rounded-br-sm shadow-md"
                  : "bg-white text-dark shadow-card rounded-2xl rounded-bl-sm border border-gray-100"
              )}>
                <p>{msg.content}</p>
                <div className={cn(
                  "flex items-center gap-1.5 mt-1.5",
                  msg.isOwn ? "justify-end" : "justify-start"
                )}>
                  <p className={cn("text-[11px] font-medium", msg.isOwn ? "text-white/70" : "text-muted/70")}>
                    {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-light px-4 md:px-6 py-4 flex items-center gap-3 flex-shrink-0 mt-auto">
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
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
  );
}
