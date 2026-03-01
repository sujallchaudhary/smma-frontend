"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Clock,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  contentApi,
  historyApi,
  autopilotApi,
  type GeneratePackageParams,
  type GenerationRecord,
} from "@/lib/api";
import { PlatformSelect } from "@/components/platform-select";

interface CloudinaryImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PackagePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState<GeneratePackageParams>({
    platform: "instagram",
    topic: "",
    tone: "professional",
    targetAudience: "",
    imageStyle: "realistic",
  });

  const update = (key: keyof GeneratePackageParams, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    // Claim any orphaned records from before per-user tracking, then load history
    historyApi.claimOrphaned().catch(() => {}).finally(() => loadHistory());
  }, []);

  async function loadHistory() {
    try {
      const res = await historyApi.getGenerations("package", 20);
      if (res.success) setHistory((res.data ?? []) as GenerationRecord[]);
    } catch {
      /* ignore */
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.topic) return toast.error("Topic is required");
    setLoading(true);
    setResult(null);
    try {
      const res = await contentApi.generatePackage(form);
      if (res.success) {
        setResult(res.data as Record<string, unknown>);
        toast.success("Content package generated!");
        loadHistory();
      } else {
        toast.error(res.error || "Generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete(id: string) {
    try {
      const res = await historyApi.delete(id);
      if (res.success) {
        setHistory((prev) => prev.filter((g) => g._id !== id));
        toast.success("Deleted");
      }
    } catch {
      toast.error("Delete failed");
    }
  }

  async function handlePublish() {
    // Post ID lives inside result.content.postId (from orchestrator.generateContentPackage)
    const cw = (result as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const postId =
      cw?.postId ||
      (result as Record<string, unknown>)?.postId ||
      (result as Record<string, unknown>)?.id ||
      "";
    if (!postId) return toast.error("No post ID found — generate a package first");
    setPublishing(true);
    try {
      const res = await autopilotApi.approveAndPublish(String(postId), { publish: true });
      if (res.success) {
        toast.success("Package approved & published!");
      } else {
        toast.error(res.error || "Publish failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPublishing(false);
    }
  }

  // The package endpoint returns: { content: { postId, platform, content: { caption, hashtags, ... }, rawContent, ... }, image: { images: [...] }, ... }
  const contentWrapper = (result as Record<string, unknown>)?.content as
    | Record<string, unknown>
    | undefined;
  const innerContent = contentWrapper?.content as
    | Record<string, unknown>
    | undefined;
  const rawContent = contentWrapper?.rawContent as
    | Record<string, unknown>
    | undefined;

  const postContent: string =
    (innerContent?.caption ? String(innerContent.caption) : "") ||
    (rawContent?.caption ? String(rawContent.caption) : "") ||
    (typeof contentWrapper?.caption === "string"
      ? (contentWrapper.caption as string)
      : "") ||
    (typeof (result as Record<string, unknown>)?.caption === "string"
      ? String((result as Record<string, unknown>).caption)
      : "") ||
    (typeof (result as Record<string, unknown>)?.text === "string"
      ? String((result as Record<string, unknown>).text)
      : "");

  const hashtags: string[] =
    (innerContent && Array.isArray(innerContent.hashtags)
      ? (innerContent.hashtags as string[])
      : null) ||
    (rawContent && Array.isArray(rawContent.hashtags)
      ? (rawContent.hashtags as string[])
      : null) ||
    (Array.isArray((result as Record<string, string[]>)?.hashtags)
      ? ((result as Record<string, string[]>).hashtags as string[])
      : []);

  // Cloudinary images from package response — may be at result.image.images or result.images
  const cloudinaryImages: CloudinaryImage[] = (() => {
    if (!result) return [];
    // First try result.image.images (package endpoint returns { image: { images: [...] } })
    const imageWrapper = (result as Record<string, unknown>).image;
    if (imageWrapper && typeof imageWrapper === "object") {
      const innerImgs = (imageWrapper as Record<string, unknown>).images;
      if (Array.isArray(innerImgs)) {
        const parsed = innerImgs
          .map((img) => {
            if (typeof img === "object" && img && "url" in img)
              return img as CloudinaryImage;
            return null;
          })
          .filter(Boolean) as CloudinaryImage[];
        if (parsed.length > 0) return parsed;
      }
    }
    // Fallback: result.images
    const imgs = (result as Record<string, unknown>).images;
    if (Array.isArray(imgs)) {
      return imgs
        .map((img) => {
          if (typeof img === "object" && img && "url" in img)
            return img as CloudinaryImage;
          return null;
        })
        .filter(Boolean) as CloudinaryImage[];
    }
    return [];
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-orange-500" />
            Content Package
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate a complete post + image package in one go
          </p>
        </div>
        <Button
          variant={showHistory ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHistory((v) => !v)}
          className="shrink-0 gap-2"
        >
          <Clock className="h-4 w-4" />
          History
          {history.length > 0 && (
            <Badge variant={showHistory ? "secondary" : "default"} className="ml-1 text-xs px-1.5 py-0">
              {history.length}
            </Badge>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ─── Form (2 cols) ─── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Package Configuration</CardTitle>
            <CardDescription>
              Define your content package parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <PlatformSelect
                  value={form.platform}
                  onValueChange={(v) => update("platform", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g. Launch announcement for a SaaS product"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => update("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Image Style</Label>
                <Select
                  value={form.imageStyle}
                  onValueChange={(v) => update("imageStyle", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="illustration">Illustration</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="3d">3D Render</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  placeholder="e.g. Startup founders"
                  value={form.targetAudience}
                  onChange={(e) => update("targetAudience", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Package…
                  </>
                ) : (
                  "Generate Package"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ─── Result (3 cols) ─── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Generated Package</CardTitle>
            <CardDescription>Complete post + image output</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <p className="text-muted-foreground text-sm">
                Configure and generate a content package.
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              </div>
            )}

            {result && (
              <Tabs defaultValue="preview">
                <TabsList className="mb-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="preview">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Cloudinary Images */}
                      {cloudinaryImages.length > 0 &&
                        cloudinaryImages.map((img, i) => (
                          <div key={i} className="space-y-2">
                            <img
                              src={img.url}
                              alt="Package image"
                              className="w-full rounded-lg border"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                asChild
                              >
                                <a
                                  href={img.url}
                                  download={`package-image-${i + 1}.${img.format || "png"}`}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}

                      <Separator />

                      {/* Post content */}
                      {postContent && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Post Content</Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(String(postContent))
                              }
                            >
                              {copied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm">
                            {String(postContent)}
                          </div>
                        </div>
                      )}

                      {/* Hashtags */}
                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hashtags.map((tag, i) => (
                            <Badge key={i} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Approve & Publish */}
                      <Separator />
                      <Button
                        className="w-full"
                        onClick={handlePublish}
                        disabled={publishing}
                      >
                        {publishing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Publishing…
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Approve &amp; Publish to {form.platform}
                          </>
                        )}
                      </Button>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="raw">
                  <ScrollArea className="h-[500px]">
                    <pre className="text-xs text-muted-foreground overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── History ─── */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Package History</CardTitle>
            <CardDescription>
              Previously generated packages ({history.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {history.map((gen) => (
                  <div
                    key={gen._id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {gen.images?.[0]?.url && (
                      <img
                        src={gen.images[0].url}
                        alt=""
                        className="h-14 w-14 rounded-md border object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(gen.input as Record<string, string>)?.topic}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(gen.createdAt)}
                        {(gen.input as Record<string, string>)?.platform && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            {(gen.input as Record<string, string>).platform}
                          </Badge>
                        )}
                      </p>
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
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
