'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface RideChatProps {
  rideId: string;
  currentUserId: string;
}

export function RideChat({ rideId, currentUserId }: RideChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?rideId=${rideId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);

        // Track unread if chat is closed
        if (!isOpen && data.length > lastMessageCountRef.current) {
          const newOnes = data.slice(lastMessageCountRef.current);
          const fromOther = newOnes.filter((m: Message) => m.senderId !== currentUserId);
          if (fromOther.length > 0) {
            setUnreadCount((prev) => prev + fromOther.length);
          }
        }
        lastMessageCountRef.current = data.length;
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  }, [rideId, currentUserId, isOpen]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage('');
        await fetchMessages();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Error al enviar');
      }
    } catch {
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 z-50 sm:left-auto sm:bottom-4 sm:right-4 sm:w-[380px]">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-primary/5 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm text-foreground">Chat del viaje</span>
                <span className="text-xs text-muted-foreground">({messages.length})</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-secondary/50 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Sin mensajes aún</p>
                  <p className="text-xs mt-1">Envía un mensaje para coordinar tu viaje</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/70 text-foreground rounded-bl-md'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-xs font-medium mb-0.5 opacity-70">
                            {msg.sender.name}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="px-3 py-3 border-t border-border/50 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-secondary/50 border border-border/50 rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={500}
                disabled={isSending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || isSending}
                className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
