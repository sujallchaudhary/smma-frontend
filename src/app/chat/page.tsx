"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Loader2,
  Send,
  User,
  Bot,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { chatApi, type ChatRespondParams } from "@/lib/api";
import { PlatformSelect } from "@/components/platform-select";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<ChatRespondParams>({
    userId: "",
    message: "",
    platform: "instagram",
    userName: "",
    brandContext: "",
    tone: "professional",
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim() || !form.userId.trim())
      return toast.error("User ID and message are required");

    const userMsg: ChatMessage = {
      role: "user",
      content: form.message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const msgText = form.message;
    setForm((p) => ({ ...p, message: "" }));
    setSending(true);

    try {
      const res = await chatApi.respond({ ...form, message: msgText });
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const reply =
          (data?.response as string) ||
          (data?.message as string) ||
          JSON.stringify(data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        toast.error(res.error || "Chat failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setSending(false);
    }
  }

  async function loadHistory() {
    if (!form.userId.trim()) return toast.error("Enter a User ID first");
    setHistoryLoading(true);
    try {
      const res = await chatApi.getHistory(form.userId, form.platform);
      if (res.success) {
        const data = res.data as Record<string, unknown>[];
        const history: ChatMessage[] = (data || []).map(
          (m: Record<string, unknown>) => ({
            role: (m.role as "user" | "assistant") || "user",
            content: String(m.content || m.message || ""),
            timestamp: String(m.timestamp || m.createdAt || ""),
          })
        );
        setMessages(history);
        toast.success(`Loaded ${history.length} messages`);
      } else {
        toast.error(res.error || "Failed to load history");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-cyan-500" />
          Chat / DM Responder
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered chat and DM response generation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Settings ─── */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Chat Settings</CardTitle>
            <CardDescription>Configure the conversation context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User ID *</Label>
              <Input
                placeholder="e.g. user_12345"
                value={form.userId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, userId: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>User Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={form.userName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, userName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <PlatformSelect
                value={form.platform ?? ""}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, platform: v }))
                }
                extraPlatforms={["whatsapp"]}
              />
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select
                value={form.tone}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, tone: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brand Context</Label>
              <Input
                placeholder="e.g. We sell eco-friendly products"
                value={form.brandContext}
                onChange={(e) =>
                  setForm((p) => ({ ...p, brandContext: e.target.value }))
                }
              />
            </div>

            <Separator />

            <Button
              variant="outline"
              className="w-full"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              {historyLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <History className="mr-2 h-4 w-4" />
              )}
              Load Chat History
            </Button>
          </CardContent>
        </Card>

        {/* ─── Chat Window ─── */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              {form.userId
                ? `Chatting as ${form.userName || form.userId}`
                : "Enter a User ID to start"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 h-[420px] pr-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No messages yet. Send a message to start the conversation.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.timestamp && (
                        <p className="text-[10px] mt-1 opacity-60">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Type your message…"
                value={form.message}
                onChange={(e) =>
                  setForm((p) => ({ ...p, message: e.target.value }))
                }
                disabled={!form.userId.trim()}
              />
              <Button
                type="submit"
                disabled={sending || !form.userId.trim() || !form.message.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
