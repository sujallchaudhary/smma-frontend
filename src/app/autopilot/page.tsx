"use client";

import { useState } from "react";
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
  Rocket,
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Send,
  Search,
  Sparkles,
  Globe,
  CheckCircle2,
  XCircle,
  ImageIcon,
  FileText,
  Package,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  autopilotApi,
  type MultiPlatformGenerateParams,
  type MultiPlatformImageParams,
  type MultiPlatformPackageParams,
  type MultiPlatformScriptParams,
  type AutopilotRunParams,
  type PlatformStatus,
} from "@/lib/api";
import { useUserConfig } from "@/components/user-config-provider";

// ─── Constants ─────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20" },
  { id: "twitter", label: "Twitter / X", color: "bg-sky-500/10 text-sky-600 border-sky-200 hover:bg-sky-500/20" },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20" },
  { id: "facebook", label: "Facebook", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20" },
];

const CONTENT_TYPES = [
  { id: "reels", label: "Reels" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
];

// ─── Helpers ───────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function PlatformToggle({
  selected,
  onChange,
  platforms,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  platforms: typeof PLATFORMS;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(toggleItem(selected, p.id))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? p.color + " ring-2 ring-offset-1 ring-current"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {active && <Check className="h-3 w-3" />}
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function ContentTypeToggle({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CONTENT_TYPES.map((ct) => {
        const active = selected.includes(ct.id);
        return (
          <button
            key={ct.id}
            type="button"
            onClick={() => onChange(toggleItem(selected, ct.id))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20 ring-2 ring-offset-1 ring-current"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {active && <Check className="h-3 w-3" />}
            {ct.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Result display per platform ───────────────────────────────────

interface PlatformResult {
  platform: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  postId?: string;
}

function PlatformResultCard({
  result,
  onPublish,
  publishing,
}: {
  result: PlatformResult;
  onPublish: (postId: string) => void;
  publishing: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const data = result.data;

  // Try to extract text content — handle both flat and nested shapes
  // multiGenerate returns: { content: { caption, ... }, rawContent: { caption, ... }, ... }
  // multiPackage returns: { content: { content: { caption }, rawContent: {...} }, image: {...} }
  const nestedContent = data?.content?.content; // for package responses
  const content =
    (typeof nestedContent === "object" && nestedContent?.caption
      ? nestedContent.caption
      : null) ||
    data?.content?.caption ||
    data?.rawContent?.caption ||
    data?.caption ||
    (typeof data?.content === "string" ? data.content : null) ||
    data?.text ||
    // Script responses
    data?.script?.captionSuggestion ||
    data?.script?.description ||
    "";

  const hashtags: string[] =
    (typeof nestedContent === "object" && Array.isArray(nestedContent?.hashtags)
      ? nestedContent.hashtags
      : null) ||
    data?.content?.hashtags ||
    data?.rawContent?.hashtags ||
    data?.hashtags ||
    data?.script?.hashtags ||
    data?.script?.tags ||
    [];

  // Extract images — from package shape (data.image.images) or flat (data.images)
  const packageImages = data?.image?.images;
  const imageSource = Array.isArray(packageImages) ? packageImages : data?.images;
  const images: { url: string; format?: string }[] = Array.isArray(imageSource)
    ? imageSource.filter((img: unknown) => img && typeof img === "object" && "url" in (img as Record<string, unknown>))
    : [];

  const postId = result.postId || data?.postId || data?.id || data?._id || "";

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  const platformColor = PLATFORMS.find((p) => p.id === result.platform);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`capitalize ${platformColor?.color || ""}`}>
              {result.platform}
            </Badge>
            {data?.status && (
              <Badge variant="outline" className="capitalize text-xs">
                {data.status}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {content && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(String(content))}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Images */}
        {images.length > 0 && (
          <div className="grid gap-2 grid-cols-2">
            {images.slice(0, 4).map((img, i) => (
              <div key={i} className="space-y-1">
                <img src={img.url} alt="" className="w-full rounded-lg border aspect-square object-cover" />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" asChild>
                    <a href={img.url} download={`${result.platform}-${i + 1}.${img.format || "png"}`}>
                      <Download className="mr-1 h-3 w-3" /> Download
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text content */}
        {content && (
          <div className="whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed max-h-48 overflow-y-auto">
            {String(content)}
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Publish button */}
        {postId && (
          <Button
            className="w-full"
            size="sm"
            onClick={() => onPublish(String(postId))}
            disabled={publishing === String(postId)}
          >
            {publishing === String(postId) ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="mr-2 h-3.5 w-3.5" />
                Approve & Publish
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page Component ───────────────────────────────────────────

export default function AutopilotPage() {
  const [activeTab, setActiveTab] = useState("multi");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlatformResult[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);

  // Filter PLATFORMS to only enabled ones
  const { isPlatformEnabled } = useUserConfig();
  const enabledPlatforms = PLATFORMS.filter((p) => isPlatformEnabled(p.id));

  // ─── Multi-Platform Post Form ───
  const [postPlatforms, setPostPlatforms] = useState<string[]>(["instagram"]);
  const [postForm, setPostForm] = useState({
    topic: "",
    tone: "professional",
    length: "medium",
    targetAudience: "",
    contentType: "post",
    linkedinTarget: "person" as "person" | "organization",
  });

  // ─── Multi-Platform Image Form ───
  const [imgPlatforms, setImgPlatforms] = useState<string[]>(["instagram"]);
  const [imgForm, setImgForm] = useState({
    prompt: "",
    style: "realistic",
    brandColors: "",
    mood: "vibrant",
  });

  // ─── Multi-Platform Package Form ───
  const [pkgPlatforms, setPkgPlatforms] = useState<string[]>(["instagram"]);
  const [pkgForm, setPkgForm] = useState({
    topic: "",
    tone: "professional",
    targetAudience: "",
    imageStyle: "realistic",
  });

  // ─── Multi-Script Form ───
  const [scriptTypes, setScriptTypes] = useState<string[]>(["reels"]);
  const [scriptForm, setScriptForm] = useState({
    topic: "",
    duration: 60,
    style: "educational",
    targetAudience: "",
    niche: "",
  });

  // ─── Autopilot Form ───
  const [autoPlatforms, setAutoPlatforms] = useState<string[]>(["instagram"]);
  const [autoForm, setAutoForm] = useState({
    topic: "",
    tone: "professional",
    targetAudience: "",
    imageStyle: "realistic",
    autoPublish: false,
    refinementIterations: 1,
    linkedinTarget: "person" as "person" | "organization",
  });

  // ─── Handlers ────────────────────────────────────────────────────

  async function handleMultiPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postForm.topic) return toast.error("Topic is required");
    if (postPlatforms.length === 0) return toast.error("Select at least one platform");
    setLoading(true);
    setResults([]);
    try {
      const params: MultiPlatformGenerateParams = { platforms: postPlatforms, ...postForm };
      const res = await autopilotApi.multiGenerate(params);
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const parsed = parseMultiResult(data, postPlatforms);
        setResults(parsed);
        toast.success(`Generated posts for ${parsed.length} platform(s)!`);
      } else {
        toast.error(res.error || "Generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleMultiImage(e: React.FormEvent) {
    e.preventDefault();
    if (!imgForm.prompt) return toast.error("Prompt is required");
    if (imgPlatforms.length === 0) return toast.error("Select at least one platform");
    setLoading(true);
    setResults([]);
    try {
      const params: MultiPlatformImageParams = { platforms: imgPlatforms, ...imgForm };
      const res = await autopilotApi.multiImage(params);
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const parsed = parseMultiResult(data, imgPlatforms);
        setResults(parsed);
        toast.success(`Generated images for ${parsed.length} platform(s)!`);
      } else {
        toast.error(res.error || "Image generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleMultiPackage(e: React.FormEvent) {
    e.preventDefault();
    if (!pkgForm.topic) return toast.error("Topic is required");
    if (pkgPlatforms.length === 0) return toast.error("Select at least one platform");
    setLoading(true);
    setResults([]);
    try {
      const params: MultiPlatformPackageParams = { platforms: pkgPlatforms, ...pkgForm };
      const res = await autopilotApi.multiPackage(params);
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const parsed = parseMultiResult(data, pkgPlatforms);
        setResults(parsed);
        toast.success(`Generated packages for ${parsed.length} platform(s)!`);
      } else {
        toast.error(res.error || "Package generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleMultiScript(e: React.FormEvent) {
    e.preventDefault();
    if (!scriptForm.topic) return toast.error("Topic is required");
    if (scriptTypes.length === 0) return toast.error("Select at least one content type");
    setLoading(true);
    setResults([]);
    try {
      const params: MultiPlatformScriptParams = { contentTypes: scriptTypes, ...scriptForm };
      const res = await autopilotApi.multiScript(params);
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const parsed = parseMultiResult(data, scriptTypes);
        setResults(parsed);
        toast.success(`Generated scripts for ${parsed.length} content type(s)!`);
      } else {
        toast.error(res.error || "Script generation failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutopilotRun(e: React.FormEvent) {
    e.preventDefault();
    if (!autoForm.topic) return toast.error("Topic is required");
    if (autoPlatforms.length === 0) return toast.error("Select at least one platform");
    setLoading(true);
    setResults([]);
    try {
      const params: AutopilotRunParams = { platforms: autoPlatforms, ...autoForm };
      const res = await autopilotApi.run(params);
      if (res.success) {
        const data = res.data as Record<string, unknown>;
        const parsed = parseMultiResult(data, autoPlatforms);
        setResults(parsed);
        toast.success("Autopilot complete! Content generated for all platforms.");
      } else {
        toast.error(res.error || "Autopilot failed");
      }
    } catch {
      toast.error("Network error – is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(postId: string) {
    setPublishing(postId);
    try {
      const res = await autopilotApi.approveAndPublish(postId, { publish: true });
      if (res.success) {
        toast.success("Published successfully!");
      } else {
        toast.error(res.error || "Publish failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPublishing(null);
    }
  }

  async function checkStatus() {
    setStatusLoading(true);
    try {
      const res = await autopilotApi.getStatus();
      if (res.success) {
        setPlatformStatus(res.data as PlatformStatus);
      }
    } catch {
      toast.error("Failed to check status");
    } finally {
      setStatusLoading(false);
    }
  }

  // ─── Parse multi-platform results ────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseMultiResult(data: Record<string, any>, keys: string[]): PlatformResult[] {
    const parsed: PlatformResult[] = [];

    // Helper to extract results from a keyed object
    function extractFromObject(obj: Record<string, any>) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
      for (const key of Object.keys(obj)) {
        if (key.startsWith("_")) continue; // skip _id etc.
        const val = obj[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
          parsed.push({
            platform: val.platform || key,
            data: val,
            postId: val.postId || val.id || val._id,
          });
        }
      }
    }

    // Check common response shapes: data.platforms, data.results, data.platformResults, data.scripts
    const candidates = [data?.platforms, data?.results, data?.platformResults, data?.scripts];
    for (const candidate of candidates) {
      if (parsed.length > 0) break;
      if (!candidate) continue;

      if (Array.isArray(candidate)) {
        candidate.forEach((item: Record<string, unknown>, i: number) => {
          parsed.push({
            platform: (item.platform as string) || keys[i] || `result-${i}`,
            data: item,
            postId: (item.postId || item.id || item._id) as string,
          });
        });
      } else if (typeof candidate === "object") {
        extractFromObject(candidate);
      }
    }

    // Fallback: check if the data itself has keys matching selected platforms
    if (parsed.length === 0) {
      for (const key of keys) {
        if (data[key] && typeof data[key] === "object") {
          parsed.push({
            platform: key,
            data: data[key],
            postId: data[key]?.postId || data[key]?.id,
          });
        }
      }
    }

    // Last fallback: show the full data as a single result
    if (parsed.length === 0 && Object.keys(data).length > 0) {
      parsed.push({
        platform: keys[0] || "result",
        data,
        postId: data?.postId || data?.id,
      });
    }

    return parsed;
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-7 w-7 text-orange-500" />
            Autopilot
          </h1>
          <p className="text-muted-foreground mt-1">
            Multi-platform generation, approval &amp; automated publishing
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkStatus}
          disabled={statusLoading}
          className="gap-2"
        >
          {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          Platform Status
        </Button>
      </div>

      {/* Platform Status Banner */}
      {platformStatus && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Platform Status:</span>
              {Object.entries(platformStatus).map(([platform, status]) => (
                <div key={platform} className="flex items-center gap-1.5">
                  {(status as { configured: boolean }).configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm capitalize">{platform}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="multi" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Images</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Packages</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="autopilot" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full Auto</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ MULTI-POST TAB ═══════════════════════ */}
        <TabsContent value="multi" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Multi-Platform Posts
                </CardTitle>
                <CardDescription>Generate posts for multiple platforms at once</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMultiPost} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platforms *</Label>
                    <PlatformToggle selected={postPlatforms} onChange={setPostPlatforms} platforms={enabledPlatforms} />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic *</Label>
                    <Input
                      placeholder="e.g. Benefits of morning routines"
                      value={postForm.topic}
                      onChange={(e) => setPostForm((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={postForm.tone} onValueChange={(v) => setPostForm((p) => ({ ...p, tone: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                          <SelectItem value="inspirational">Inspirational</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Length</Label>
                      <Select value={postForm.length} onValueChange={(v) => setPostForm((p) => ({ ...p, length: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Input
                      placeholder="e.g. Small business owners aged 25-40"
                      value={postForm.targetAudience}
                      onChange={(e) => setPostForm((p) => ({ ...p, targetAudience: e.target.value }))}
                    />
                  </div>
                  {postPlatforms.includes("linkedin") && (
                    <div className="space-y-2">
                      <Label>LinkedIn: Publish As</Label>
                      <Select value={postForm.linkedinTarget} onValueChange={(v) => setPostForm((p) => ({ ...p, linkedinTarget: v as "person" | "organization" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="person">Personal Profile</SelectItem>
                          <SelectItem value="organization">Organization Page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                    ) : (
                      <>Generate for {postPlatforms.length} Platform{postPlatforms.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <ResultsPanel results={results} loading={loading} onPublish={handlePublish} publishing={publishing} />
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ MULTI-IMAGE TAB ══════════════════════ */}
        <TabsContent value="images" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-pink-500" />
                  Multi-Platform Images
                </CardTitle>
                <CardDescription>Generate images optimized for each platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMultiImage} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platforms *</Label>
                    <PlatformToggle selected={imgPlatforms} onChange={setImgPlatforms} platforms={enabledPlatforms} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt *</Label>
                    <Input
                      placeholder="e.g. Flat-lay productivity desk setup"
                      value={imgForm.prompt}
                      onChange={(e) => setImgForm((p) => ({ ...p, prompt: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select value={imgForm.style} onValueChange={(v) => setImgForm((p) => ({ ...p, style: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realistic">Realistic</SelectItem>
                          <SelectItem value="illustration">Illustration</SelectItem>
                          <SelectItem value="3d">3D Render</SelectItem>
                          <SelectItem value="minimalist">Minimalist</SelectItem>
                          <SelectItem value="abstract">Abstract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mood</Label>
                      <Select value={imgForm.mood} onValueChange={(v) => setImgForm((p) => ({ ...p, mood: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vibrant">Vibrant</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="cool">Cool</SelectItem>
                          <SelectItem value="pastel">Pastel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand Colors</Label>
                    <Input
                      placeholder="e.g. #FF5733, #2E86AB"
                      value={imgForm.brandColors}
                      onChange={(e) => setImgForm((p) => ({ ...p, brandColors: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                    ) : (
                      <>Generate for {imgPlatforms.length} Platform{imgPlatforms.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <ResultsPanel results={results} loading={loading} onPublish={handlePublish} publishing={publishing} />
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ MULTI-PACKAGE TAB ════════════════════ */}
        <TabsContent value="packages" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Multi-Platform Packages
                </CardTitle>
                <CardDescription>Full post + image packages for each platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMultiPackage} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platforms *</Label>
                    <PlatformToggle selected={pkgPlatforms} onChange={setPkgPlatforms} platforms={enabledPlatforms} />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic *</Label>
                    <Input
                      placeholder="e.g. SaaS product launch announcement"
                      value={pkgForm.topic}
                      onChange={(e) => setPkgForm((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={pkgForm.tone} onValueChange={(v) => setPkgForm((p) => ({ ...p, tone: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Select value={pkgForm.imageStyle} onValueChange={(v) => setPkgForm((p) => ({ ...p, imageStyle: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realistic">Realistic</SelectItem>
                          <SelectItem value="illustration">Illustration</SelectItem>
                          <SelectItem value="minimalist">Minimalist</SelectItem>
                          <SelectItem value="3d">3D Render</SelectItem>
                          <SelectItem value="abstract">Abstract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Input
                      placeholder="e.g. Startup founders"
                      value={pkgForm.targetAudience}
                      onChange={(e) => setPkgForm((p) => ({ ...p, targetAudience: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                    ) : (
                      <>Generate for {pkgPlatforms.length} Platform{pkgPlatforms.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <ResultsPanel results={results} loading={loading} onPublish={handlePublish} publishing={publishing} />
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ MULTI-SCRIPT TAB ═════════════════════ */}
        <TabsContent value="scripts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-purple-500" />
                  Multi-Type Scripts
                </CardTitle>
                <CardDescription>Generate scripts for multiple content types</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMultiScript} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content Types *</Label>
                    <ContentTypeToggle selected={scriptTypes} onChange={setScriptTypes} />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic *</Label>
                    <Input
                      placeholder="e.g. 5 productivity hacks"
                      value={scriptForm.topic}
                      onChange={(e) => setScriptForm((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Duration (sec)</Label>
                      <Input
                        type="number"
                        min={15}
                        max={600}
                        value={scriptForm.duration}
                        onChange={(e) => setScriptForm((p) => ({ ...p, duration: parseInt(e.target.value) || 60 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select value={scriptForm.style} onValueChange={(v) => setScriptForm((p) => ({ ...p, style: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="entertaining">Entertaining</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="motivational">Motivational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Niche</Label>
                    <Input
                      placeholder="e.g. Fitness, Tech"
                      value={scriptForm.niche}
                      onChange={(e) => setScriptForm((p) => ({ ...p, niche: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                    ) : (
                      <>Generate {scriptTypes.length} Script{scriptTypes.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <ResultsPanel results={results} loading={loading} onPublish={handlePublish} publishing={publishing} />
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ FULL AUTOPILOT TAB ═══════════════════ */}
        <TabsContent value="autopilot" className="space-y-6">
          <Card className="border-orange-200 bg-orange-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Full Autopilot Mode</span>
                <span className="text-muted-foreground">
                  — AI researches your topic via Google Search, generates optimized content &amp; images for every platform, refines them, and optionally publishes directly.
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-orange-500" />
                  Autopilot Configuration
                </CardTitle>
                <CardDescription>Set it and let AI handle everything</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAutopilotRun} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platforms *</Label>
                    <PlatformToggle selected={autoPlatforms} onChange={setAutoPlatforms} platforms={enabledPlatforms} />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic *</Label>
                    <Input
                      placeholder="e.g. AI trends in 2025"
                      value={autoForm.topic}
                      onChange={(e) => setAutoForm((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={autoForm.tone} onValueChange={(v) => setAutoForm((p) => ({ ...p, tone: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                          <SelectItem value="inspirational">Inspirational</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Image Style</Label>
                      <Select value={autoForm.imageStyle} onValueChange={(v) => setAutoForm((p) => ({ ...p, imageStyle: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realistic">Realistic</SelectItem>
                          <SelectItem value="illustration">Illustration</SelectItem>
                          <SelectItem value="minimalist">Minimalist</SelectItem>
                          <SelectItem value="3d">3D Render</SelectItem>
                          <SelectItem value="abstract">Abstract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Input
                      placeholder="e.g. Tech entrepreneurs"
                      value={autoForm.targetAudience}
                      onChange={(e) => setAutoForm((p) => ({ ...p, targetAudience: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Refinement Rounds</Label>
                      <Select
                        value={String(autoForm.refinementIterations)}
                        onValueChange={(v) => setAutoForm((p) => ({ ...p, refinementIterations: parseInt(v) }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="1">1 round</SelectItem>
                          <SelectItem value="2">2 rounds</SelectItem>
                          <SelectItem value="3">3 rounds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Auto-Publish</Label>
                      <Select
                        value={autoForm.autoPublish ? "yes" : "no"}
                        onValueChange={(v) => setAutoForm((p) => ({ ...p, autoPublish: v === "yes" }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No — Review first</SelectItem>
                          <SelectItem value="yes">Yes — Publish immediately</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {autoPlatforms.includes("linkedin") && (
                    <div className="space-y-2">
                      <Label>LinkedIn: Publish As</Label>
                      <Select value={autoForm.linkedinTarget} onValueChange={(v) => setAutoForm((p) => ({ ...p, linkedinTarget: v as "person" | "organization" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="person">Personal Profile</SelectItem>
                          <SelectItem value="organization">Organization Page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <Button type="submit" className="w-full" disabled={loading} variant="default">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Autopilot…
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Research &amp; Generate for {autoPlatforms.length} Platform{autoPlatforms.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <ResultsPanel results={results} loading={loading} onPublish={handlePublish} publishing={publishing} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared Results Panel ──────────────────────────────────────────

function ResultsPanel({
  results,
  loading,
  onPublish,
  publishing,
}: {
  results: PlatformResult[];
  loading: boolean;
  onPublish: (postId: string) => void;
  publishing: string | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-muted-foreground">Generating content across platforms…</p>
          <p className="text-xs text-muted-foreground">This may take a minute for research &amp; image generation</p>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Rocket className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Select platforms, configure your content, and hit generate.</p>
          <p className="text-xs mt-1">Results for each platform will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-14rem)]">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Results</h3>
          <Badge variant="secondary">{results.length} platform{results.length !== 1 ? "s" : ""}</Badge>
        </div>
        {results.map((result, i) => (
          <PlatformResultCard
            key={`${result.platform}-${i}`}
            result={result}
            onPublish={onPublish}
            publishing={publishing}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
