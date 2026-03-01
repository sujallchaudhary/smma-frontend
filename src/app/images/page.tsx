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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Loader2,
  Download,
  ExternalLink,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  contentApi,
  historyApi,
  type GenerateImageParams,
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

export default function ImagesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState<GenerateImageParams>({
    prompt: "",
    platform: "instagram",
    style: "realistic",
    aspectRatio: "1:1",
    brandColors: "",
    mood: "vibrant",
  });

  const update = (key: keyof GenerateImageParams, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await historyApi.getGenerations("image", 20);
      if (res.success) setHistory((res.data ?? []) as GenerationRecord[]);
    } catch {
      /* ignore */
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.prompt) return toast.error("Image prompt is required");
    setLoading(true);
    setResult(null);
    try {
      const res = await contentApi.generateImage(form);
      if (res.success) {
        setResult(res.data as Record<string, unknown>);
        toast.success("Image generated & uploaded to Cloudinary!");
        loadHistory();
      } else {
        toast.error(res.error || "Image generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
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

  // Extract images from the Cloudinary-enhanced response
  const cloudinaryImages: CloudinaryImage[] = (() => {
    if (!result) return [];
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
            <ImageIcon className="h-7 w-7 text-pink-500" />
            Image Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Create stunning visuals with Gemini AI — images stored on Cloudinary
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Form ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Image Configuration</CardTitle>
            <CardDescription>Describe the image you want</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt *</Label>
                <Textarea
                  placeholder="e.g. A flat-lay photo of a MacBook, coffee, and notebook on a marble desk for an Instagram productivity post"
                  value={form.prompt}
                  onChange={(e) => update("prompt", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <PlatformSelect
                    value={form.platform ?? ""}
                    onValueChange={(v) => update("platform", v)}
                    extraPlatforms={["youtube"]}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={form.style}
                    onValueChange={(v) => update("style", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="illustration">Illustration</SelectItem>
                      <SelectItem value="3d">3D Render</SelectItem>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                      <SelectItem value="cartoon">Cartoon</SelectItem>
                      <SelectItem value="abstract">Abstract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={form.aspectRatio}
                    onValueChange={(v) => update("aspectRatio", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Story/Reel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={form.mood}
                    onValueChange={(v) => update("mood", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cool">Cool</SelectItem>
                      <SelectItem value="pastel">Pastel</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Brand Colors</Label>
                <Input
                  placeholder="e.g. #FF5733, #2E86AB"
                  value={form.brandColors}
                  onChange={(e) => update("brandColors", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Image…
                  </>
                ) : (
                  "Generate Image"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ─── Result ─── */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
            <CardDescription>
              AI-generated visual — hosted on Cloudinary
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <p className="text-muted-foreground text-sm">
                Describe your desired image and generate it.
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              </div>
            )}

            {result && cloudinaryImages.length > 0 && (
              <div className="space-y-4">
                {cloudinaryImages.map((img, i) => (
                  <div key={i} className="space-y-2">
                    <img
                      src={img.url}
                      alt={`Generated ${i + 1}`}
                      className="w-full rounded-lg border"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <a href={img.url} download={`image-${i + 1}.${img.format || "png"}`}>
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
                    {img.width && img.height && (
                      <p className="text-xs text-muted-foreground">
                        {img.width}×{img.height} • {img.format?.toUpperCase()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result && cloudinaryImages.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No images returned. Check your Cloudinary credentials.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── History ─── */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Image History</CardTitle>
            <CardDescription>
              Previously generated images ({history.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {history.map((gen) => (
                  <div key={gen._id} className="group relative space-y-2">
                    {gen.images?.[0]?.url && (
                      <a
                        href={gen.images[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={gen.images[0].url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-lg border hover:ring-2 ring-primary transition-all"
                        />
                      </a>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(gen.createdAt)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(gen._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs truncate">
                      {(gen.input as Record<string, string>)?.prompt}
                    </p>
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
