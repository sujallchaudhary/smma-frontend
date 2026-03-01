"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Video,
  ImageIcon,
  Package,
  CalendarDays,
  MessageCircle,
  Activity,
  Clock,
  Trash2,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import {
  systemApi,
  historyApi,
  type GenerationRecord,
  type GenerationStats,
} from "@/lib/api";

const features = [
  {
    title: "Autopilot",
    description: "Multi-platform generation, auto-research & one-click publish",
    href: "/autopilot",
    icon: Rocket,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    type: null,
  },
  {
    title: "Post Generator",
    description: "Create platform-optimized social media posts with AI",
    href: "/content",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    type: "post" as const,
  },
  {
    title: "Script Generator",
    description: "Generate video scripts for Reels, YouTube & TikTok",
    href: "/scripts",
    icon: Video,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    type: "script" as const,
  },
  {
    title: "Image Generator",
    description: "Create stunning visuals with Gemini AI",
    href: "/images",
    icon: ImageIcon,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    type: "image" as const,
  },
  {
    title: "Content Package",
    description: "Generate complete post + image packages",
    href: "/package",
    icon: Package,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    type: "package" as const,
  },
  {
    title: "Calendar & Campaigns",
    description: "Plan, schedule and manage content campaigns",
    href: "/calendar",
    icon: CalendarDays,
    color: "text-green-500",
    bg: "bg-green-500/10",
    type: null,
  },
  {
    title: "Chat / DM Responder",
    description: "AI-powered chat and DM response generation",
    href: "/chat",
    icon: MessageCircle,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    type: null,
  },
];

const typeIcons: Record<string, typeof FileText> = {
  post: FileText,
  script: Video,
  image: ImageIcon,
  package: Package,
};

const typeColors: Record<string, string> = {
  post: "text-blue-500",
  script: "text-purple-500",
  image: "text-pink-500",
  package: "text-orange-500",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getLabel(gen: GenerationRecord) {
  const inp = gen.input as Record<string, string>;
  return inp.topic || inp.prompt || gen.type;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [historyType, setHistoryType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemApi
      .health()
      .then((r) => setHealth(r as unknown as { status: string }))
      .catch(() => setHealth(null));
    // Claim any orphaned records from before per-user tracking
    historyApi.claimOrphaned().catch(() => {}).finally(() => loadData());
  }, []);

  useEffect(() => {
    loadHistory();
  }, [historyType]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, histRes] = await Promise.all([
        historyApi.getStats(),
        historyApi.getGenerations(undefined, 10),
      ]);
      if (statsRes.success) setStats(statsRes.data as GenerationStats);
      if (histRes.success) setHistory((histRes.data ?? []) as GenerationRecord[]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const type = historyType === "all" ? undefined : historyType;
      const res = await historyApi.getGenerations(type, 20);
      if (res.success) setHistory((res.data ?? []) as GenerationRecord[]);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await historyApi.delete(id);
      if (res.success) {
        setHistory((prev) => prev.filter((g) => g._id !== id));
        toast.success("Deleted");
        // refresh stats
        const s = await historyApi.getStats();
        if (s.success) setStats(s.data as GenerationStats);
      }
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered social media automation platform
          </p>
        </div>
        <Badge
          variant={health?.status ? "default" : "destructive"}
          className="flex items-center gap-1.5 px-3 py-1"
        >
          <Activity className="h-3.5 w-3.5" />
          {health ? "API Connected" : "API Offline"}
        </Badge>
      </div>

      {/* ─── Stats Cards ─── */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5">
          {(["post", "script", "image", "package"] as const).map((t) => {
            const Icon = typeIcons[t];
            return (
              <Card key={t}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div
                    className={`rounded-lg p-2 ${
                      t === "post"
                        ? "bg-blue-500/10"
                        : t === "script"
                        ? "bg-purple-500/10"
                        : t === "image"
                        ? "bg-pink-500/10"
                        : "bg-orange-500/10"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${typeColors[t]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats[t]}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t}s
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg p-2 bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Feature Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`rounded-lg p-2 ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  {feature.type && stats && (
                    <p className="text-xs text-muted-foreground">
                      {stats[feature.type]} generations
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── History ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generation History</h2>
        </div>

        <Tabs
          value={historyType}
          onValueChange={setHistoryType}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="post">Posts</TabsTrigger>
            <TabsTrigger value="script">Scripts</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="package">Packages</TabsTrigger>
          </TabsList>

          <TabsContent value={historyType} className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading…
                </CardContent>
              </Card>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No generations yet. Start creating content!
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {history.map((gen) => {
                    const Icon = typeIcons[gen.type] || FileText;
                    const color = typeColors[gen.type] || "text-gray-500";
                    const hasImages =
                      gen.images && gen.images.length > 0;

                    return (
                      <Card key={gen._id}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-lg p-2 mt-0.5 shrink-0 ${
                                gen.type === "post"
                                  ? "bg-blue-500/10"
                                  : gen.type === "script"
                                  ? "bg-purple-500/10"
                                  : gen.type === "image"
                                  ? "bg-pink-500/10"
                                  : "bg-orange-500/10"
                              }`}
                            >
                              <Icon className={`h-4 w-4 ${color}`} />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {gen.type}
                                </Badge>
                                {(gen.input as Record<string, string>)
                                  ?.platform && (
                                  <Badge variant="secondary" className="text-xs">
                                    {(gen.input as Record<string, string>).platform}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto shrink-0">
                                  <Clock className="h-3 w-3" />
                                  {timeAgo(gen.createdAt)}
                                </span>
                              </div>

                              <p className="text-sm font-medium truncate">
                                {getLabel(gen)}
                              </p>

                              {/* Image thumbnails */}
                              {hasImages && (
                                <div className="flex gap-2 pt-1">
                                  {gen.images.slice(0, 3).map((img, i) => (
                                    <a
                                      key={i}
                                      href={img.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={img.url}
                                        alt=""
                                        className="h-16 w-16 rounded-md border object-cover hover:ring-2 ring-primary transition-all"
                                      />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(gen._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
