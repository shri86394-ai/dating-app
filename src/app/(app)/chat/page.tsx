"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Clock, Sparkles } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "me" | "them";
  timestamp: Date;
  isRead: boolean;
}

const ICEBREAKER_CHIPS = [
  "What made you smile today?",
  "What's your dream vacation?",
  "Favorite weekend activity?",
  "Coffee or tea person?",
  "Best movie you've seen lately?",
];

// Mock initial messages for demonstration
const INITIAL_MESSAGES: Message[] = [];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [showIcebreakers, setShowIcebreakers] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function sendMessage(content: string) {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: content.trim(),
      sender: "me",
      timestamp: new Date(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setShowIcebreakers(false);

    // Simulate received message for demo (remove in production with WebSocket)
    setTimeout(() => {
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        content: "That's great! Tell me more about that.",
        sender: "them",
        timestamp: new Date(),
        isRead: false,
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000);
  }

  function handleIcebreakerClick(chip: string) {
    setInput(chip);
    inputRef.current?.focus();
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Calculate time until Sunday midnight
  function getTimeUntilExpiry() {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (7 - now.getDay()));
    sunday.setHours(0, 0, 0, 0);
    const diff = sunday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Ephemeral banner */}
      <div className="flex items-center justify-center gap-2 border-b bg-primary/5 px-4 py-2">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs text-primary font-medium">
          This chat will disappear on Sunday at midnight ({getTimeUntilExpiry()}{" "}
          remaining)
        </p>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="mx-auto max-w-lg space-y-3 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Start the conversation</h3>
              <p className="mt-1 max-w-[250px] text-sm text-muted-foreground">
                Break the ice with a message or tap one of the suggestions below
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender === "me"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    msg.sender === "me"
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                  {msg.sender === "me" && (
                    <span className="ml-1">
                      {msg.isRead ? " \u2713\u2713" : " \u2713"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Icebreaker chips */}
      {showIcebreakers && (
        <div className="border-t bg-background px-4 py-3">
          <div className="mx-auto max-w-lg">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Icebreakers
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ICEBREAKER_CHIPS.map((chip) => (
                <Badge
                  key={chip}
                  variant="outline"
                  className="shrink-0 cursor-pointer px-3 py-1.5 text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  onClick={() => handleIcebreakerClick(chip)}
                >
                  {chip}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background px-4 py-3 pb-20">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
