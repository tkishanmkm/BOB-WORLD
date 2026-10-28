
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useRef, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import type { LiveAgentMessageType } from '@/lib/types';
import { INITIAL_LIVE_AGENT_MESSAGES, LIVE_AGENT_MESSAGES_STORAGE_KEY } from '@/lib/constants';
import { cn } from "@/lib/utils";

const systemConnectMessage: LiveAgentMessageType = {
  id: 'system-connect',
  sender: 'system',
  content: 'Agent is connected',
  timestamp: new Date(0).toISOString(), 
};

export default function AgentLiveChatPage() {
  const [messages, setMessages] = useState<LiveAgentMessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMessages = () => {
      let currentMessages: LiveAgentMessageType[] = [];
      const storedMessagesString = localStorage.getItem(LIVE_AGENT_MESSAGES_STORAGE_KEY);

      if (storedMessagesString) {
        try {
          currentMessages = JSON.parse(storedMessagesString).map((msg: any) => ({
            ...msg,
            id: msg.id || crypto.randomUUID(),
            timestamp: msg.timestamp || new Date().toISOString()
          }));
        } catch (e) {
          console.error("Failed to parse messages from localStorage", e);
          currentMessages = INITIAL_LIVE_AGENT_MESSAGES.map(msg => ({...msg, id: msg.id || crypto.randomUUID()}));
        }
      } else {
        currentMessages = INITIAL_LIVE_AGENT_MESSAGES.map(msg => ({...msg, id: msg.id || crypto.randomUUID()}));
      }

      currentMessages = currentMessages.filter(msg => msg.id !== systemConnectMessage.id);
      
      const finalMessages = [systemConnectMessage, ...currentMessages]
        .sort((a: LiveAgentMessageType, b: LiveAgentMessageType) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(finalMessages);
    };
    loadMessages();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, rating]); 

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage: LiveAgentMessageType = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    let messagesForUpdate = messages.filter(msg => msg.id !== systemConnectMessage.id);
    if (messages.findIndex(msg => msg.id === systemConnectMessage.id) === -1) {
         messagesForUpdate = [systemConnectMessage, ...messagesForUpdate];
    }

    const updatedMessages = [...messagesForUpdate, userMessage].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setMessages(updatedMessages);
    localStorage.setItem(LIVE_AGENT_MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages.filter(msg => msg.id !== systemConnectMessage.id)));
    setNewMessage('');

    setTimeout(() => {
      const agentReply: LiveAgentMessageType = {
        id: crypto.randomUUID(),
        sender: 'agent',
        content: "Thanks for your message! An agent will be with you shortly.",
        timestamp: new Date().toISOString(),
      };
      
      let currentMsgs = messages.filter(m => m.id !== systemConnectMessage.id);
      if(messages.findIndex(m => m.id === systemConnectMessage.id) === -1) {
        currentMsgs = [systemConnectMessage, ...currentMsgs];
      }
      currentMsgs = [...currentMsgs, userMessage];

      const messagesWithReply = [...currentMsgs, agentReply].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(messagesWithReply);
      localStorage.setItem(LIVE_AGENT_MESSAGES_STORAGE_KEY, JSON.stringify(messagesWithReply.filter(msg => msg.id !== systemConnectMessage.id)));
    }, 1500);
  };

  return (
     <div className="flex flex-col h-full">
      <header className="bg-background p-4 flex items-center justify-between border-b shrink-0 rounded-t-lg">
        <Link href="/need-help" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Agent Live Chat</h1>
        <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-6 w-6" />
        </Button>
      </header>
      <div className="flex flex-col flex-1 bg-card shadow-md rounded-b-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4 bg-muted/30">
        <div className="space-y-4">
          {messages.map((message) => 
            message.sender === 'system' ? (
              <div key={message.id} className="text-center my-3">
                <p className="text-xs text-muted-foreground italic px-2 py-1 bg-background rounded-full inline-block shadow-sm">{message.content}</p>
              </div>
            ) : (
              <div
                key={message.id}
                className={`flex flex-col mb-4 ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-baseline gap-2 text-xs text-muted-foreground mb-1 ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="font-semibold">
                    {message.sender === "user" ? "You" : "Agent"}
                  </span>
                  <span>
                    {format(parseISO(message.timestamp), "MMM dd, p")}
                  </span>
                </div>
                <div
                  className={`rounded-lg p-3 max-w-[85%] sm:max-w-[75%] text-sm shadow ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground rounded-bl-none border border-border/50"
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                </div>
              </div>
            )
          )}

          <div className="text-center my-4 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground italic px-3 py-1.5 bg-background rounded-full inline-block shadow">
              Chat is closed
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 space-y-3 mb-4">
            <p className="text-sm font-medium text-foreground">Rate your chat experience:</p>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-8 w-8 cursor-pointer transition-colors",
                    (hoverRating || rating) >= star 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-muted-foreground/50 hover:text-yellow-300'
                  )}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              ))}
            </div>
            {rating > 0 && (
              <Button 
                size="sm" 
                className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  alert(`Thank you for your ${rating}-star feedback! (This is a placeholder action)`);
                  setRating(0);
                }}
              >
                Submit Feedback
              </Button>
            )}
          </div>
        </div>
        <div ref={chatEndRef} />
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-card flex items-center gap-2 shrink-0 rounded-b-lg">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 h-11 text-base"
          autoComplete="off"
        />
        <Button type="submit" className="h-11 px-6 text-base">Send</Button>
      </form>
      </div>
    </div>
  );
}
