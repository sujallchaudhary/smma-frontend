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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Loader2,
  Copy,
  Check,
  Clock,
  Mic,
  Type,
  Eye,
  Music,
  Hash,
  MessageSquare,
  Zap,
  Clapperboard,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  contentApi,
  historyApi,
  type GenerateScriptParams,
  type GenerationRecord,
} from "@/lib/api";

// ─── Types matching the API response ────────────────────────────────

interface ScriptSection {
  timestamp?: string;
  narration?: string;
  textOverlay?: string;
  visualDirection?: string;
}

interface ScriptScene extends ScriptSection {
  transition?: string;
}

// YouTube-specific section shape
interface YouTubeSection {
  name?: string;
  timestamp?: string;
  type?: string;
  narration?: string;
  visualNotes?: string;
  onScreenText?: string;
}

interface ScriptData {
  title?: string;
  duration?: number;
  // Reels / TikTok structure
  hook?: ScriptSection;
  scenes?: ScriptScene[];
  cta?: ScriptSection;
  suggestedAudio?: string;
  hashtags?: string[];
  captionSuggestion?: string;
  // YouTube structure
  description?: string;
  tags?: string[];
  thumbnailSuggestion?: string;
  sections?: YouTubeSection[];
  estimatedDuration?: string;
  keyRetentionPoints?: string[];
}

interface ScriptResponse {
  contentType?: string;
  duration?: number;
  topic?: string;
  script?: ScriptData;
  status?: string;
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

export default function ScriptsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScriptResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState<GenerateScriptParams>({
    contentType: "reels",
    topic: "",
    duration: 60,
    style: "educational",
    targetAudience: "",
    niche: "",
  });

  const update = (key: keyof GenerateScriptParams, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await historyApi.getGenerations("script", 20);
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
      const res = await contentApi.generateScript(form);
      if (res.success) {
        setResult(res.data as ScriptResponse);
        toast.success("Script generated!");
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

  function copyFullScript() {
    if (!result?.script) return;
    const s = result.script;
    const lines: string[] = [];
    if (s.title) lines.push(`📝 ${s.title}\n`);

    const isYouTube = result.contentType === "youtube";

    if (isYouTube) {
      // YouTube format
      if (s.description) lines.push(`📋 Description: ${s.description}\n`);
      s.sections?.forEach((section, i) => {
        lines.push(`── ${section.name || `Section ${i + 1}`} [${section.timestamp || ""}] (${section.type || ""}) ──`);
        if (section.narration) lines.push(`🎙️ "${section.narration}"`);
        if (section.onScreenText) lines.push(`📺 Text: ${section.onScreenText}`);
        if (section.visualNotes) lines.push(`🎥 Visual: ${section.visualNotes}`);
        lines.push("");
      });
      if (s.estimatedDuration) lines.push(`⏱️ Est. Duration: ${s.estimatedDuration}`);
      if (s.thumbnailSuggestion) lines.push(`🖼️ Thumbnail: ${s.thumbnailSuggestion}`);
      if (s.keyRetentionPoints?.length) lines.push(`\n📌 Key Retention Points:\n${s.keyRetentionPoints.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`);
      if (s.tags?.length) lines.push(`\n🏷️ Tags: ${s.tags.join(", ")}`);
    } else {
      // Reels / TikTok format
      if (s.hook) {
        lines.push(`🎬 HOOK [${s.hook.timestamp || ""}]`);
        lines.push(`🎙️ "${s.hook.narration || ""}"`);
        lines.push(`📺 Text: ${s.hook.textOverlay || ""}`);
        lines.push(`🎥 Visual: ${s.hook.visualDirection || ""}\n`);
      }
      s.scenes?.forEach((scene, i) => {
        lines.push(`── Scene ${i + 1} [${scene.timestamp || ""}] ──`);
        lines.push(`🎙️ "${scene.narration || ""}"`);
        lines.push(`📺 Text: ${scene.textOverlay || ""}`);
        lines.push(`🎥 Visual: ${scene.visualDirection || ""}`);
        if (scene.transition) lines.push(`↔️ Transition: ${scene.transition}`);
        lines.push("");
      });
      if (s.cta) {
        lines.push(`🚀 CTA [${s.cta.timestamp || ""}]`);
        lines.push(`🎙️ "${s.cta.narration || ""}"`);
        lines.push(`📺 Text: ${s.cta.textOverlay || ""}`);
        lines.push(`🎥 Visual: ${s.cta.visualDirection || ""}\n`);
      }
      if (s.suggestedAudio) lines.push(`🎵 Audio: ${s.suggestedAudio}`);
      if (s.hashtags?.length) lines.push(`# ${s.hashtags.join(" ")}`);
      if (s.captionSuggestion) lines.push(`\n💬 Caption: ${s.captionSuggestion}`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Full script copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const script = result?.script;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-7 w-7 text-purple-500" />
            Script Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate video scripts for Reels, YouTube &amp; TikTok
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
            <CardTitle>Script Configuration</CardTitle>
            <CardDescription>Set your video script parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={form.contentType}
                    onValueChange={(v) => update("contentType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reels">Instagram Reels</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={600}
                    value={form.duration}
                    onChange={(e) =>
                      update("duration", parseInt(e.target.value) || 60)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g. 5 productivity hacks for remote workers"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="entertaining">Entertaining</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="motivational">Motivational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Niche</Label>
                  <Input
                    placeholder="e.g. Fitness, Tech, Business"
                    value={form.niche}
                    onChange={(e) => update("niche", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  placeholder="e.g. Gen Z content creators"
                  value={form.targetAudience}
                  onChange={(e) => update("targetAudience", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Script…
                  </>
                ) : (
                  "Generate Script"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ─── Result (3 cols) ─── */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Clapperboard className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>Configure and generate a script to see results here.</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-500" />
                  <p className="text-sm text-muted-foreground">
                    Generating your script…
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && script && (
            <Tabs defaultValue="visual">
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="visual">Visual Script</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyFullScript}
                  className="gap-1.5"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy Script
                </Button>
              </div>

              {/* ─── Visual tab ─── */}
              <TabsContent value="visual">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="space-y-4">
                    {/* Header */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-bold">
                              {script.title || result.topic}
                            </h2>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {script.estimatedDuration || `${script.duration || result.duration}s`}
                              </span>
                              <Badge variant="outline" className="capitalize">
                                {result.contentType}
                              </Badge>
                              <Badge
                                variant={
                                  result.status === "complete"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {result.status}
                              </Badge>
                            </div>
                            {/* YouTube description */}
                            {script.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {script.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Reels / TikTok: Hook → Scenes → CTA ── */}

                    {/* Hook */}
                    {script.hook && (
                      <Card className="border-l-4 border-l-yellow-500">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              Hook
                            </CardTitle>
                            {script.hook.timestamp && (
                              <Badge variant="outline" className="font-mono text-xs">
                                <Clock className="mr-1 h-3 w-3" />
                                {script.hook.timestamp}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <ScriptDetail
                            icon={<Mic className="h-3.5 w-3.5" />}
                            label="Narration"
                            value={script.hook.narration}
                          />
                          <ScriptDetail
                            icon={<Type className="h-3.5 w-3.5" />}
                            label="Text Overlay"
                            value={script.hook.textOverlay}
                            badge
                          />
                          <ScriptDetail
                            icon={<Eye className="h-3.5 w-3.5" />}
                            label="Visual Direction"
                            value={script.hook.visualDirection}
                            muted
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Scenes */}
                    {script.scenes && script.scenes.length > 0 && (
                      <div className="space-y-3">
                        {script.scenes.map((scene, i) => (
                          <Card
                            key={i}
                            className="border-l-4 border-l-purple-500"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Clapperboard className="h-4 w-4 text-purple-500" />
                                  Scene {i + 1}
                                  {scene.textOverlay && (
                                    <span className="text-muted-foreground font-normal text-sm">
                                      — {scene.textOverlay}
                                    </span>
                                  )}
                                </CardTitle>
                                {scene.timestamp && (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    <Clock className="mr-1 h-3 w-3" />
                                    {scene.timestamp}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <ScriptDetail
                                icon={<Mic className="h-3.5 w-3.5" />}
                                label="Narration"
                                value={scene.narration}
                              />
                              <ScriptDetail
                                icon={<Eye className="h-3.5 w-3.5" />}
                                label="Visual Direction"
                                value={scene.visualDirection}
                                muted
                              />
                              {scene.transition && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    ↔️ {scene.transition}
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    {script.cta && (
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              Call to Action
                            </CardTitle>
                            {script.cta.timestamp && (
                              <Badge variant="outline" className="font-mono text-xs">
                                <Clock className="mr-1 h-3 w-3" />
                                {script.cta.timestamp}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <ScriptDetail
                            icon={<Mic className="h-3.5 w-3.5" />}
                            label="Narration"
                            value={script.cta.narration}
                          />
                          <ScriptDetail
                            icon={<Type className="h-3.5 w-3.5" />}
                            label="Text Overlay"
                            value={script.cta.textOverlay}
                            badge
                          />
                          <ScriptDetail
                            icon={<Eye className="h-3.5 w-3.5" />}
                            label="Visual Direction"
                            value={script.cta.visualDirection}
                            muted
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* ── YouTube: Sections ── */}
                    {script.sections && script.sections.length > 0 && (
                      <div className="space-y-3">
                        {script.sections.map((section, i) => (
                          <Card
                            key={i}
                            className="border-l-4 border-l-red-500"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Clapperboard className="h-4 w-4 text-red-500" />
                                  {section.name || `Section ${i + 1}`}
                                  {section.type && (
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {section.type}
                                    </Badge>
                                  )}
                                </CardTitle>
                                {section.timestamp && (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    <Clock className="mr-1 h-3 w-3" />
                                    {section.timestamp}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <ScriptDetail
                                icon={<Mic className="h-3.5 w-3.5" />}
                                label="Narration"
                                value={section.narration}
                              />
                              <ScriptDetail
                                icon={<Type className="h-3.5 w-3.5" />}
                                label="On-Screen Text"
                                value={section.onScreenText}
                                badge
                              />
                              <ScriptDetail
                                icon={<Eye className="h-3.5 w-3.5" />}
                                label="Visual Notes"
                                value={section.visualNotes}
                                muted
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* YouTube extras: thumbnail, key retention points */}
                    {script.thumbnailSuggestion && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-2">
                            <Eye className="h-4 w-4 mt-0.5 text-red-500" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Thumbnail Suggestion
                              </p>
                              <p className="text-sm mt-0.5">{script.thumbnailSuggestion}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {script.keyRetentionPoints && script.keyRetentionPoints.length > 0 && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-amber-500" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Key Retention Points
                              </p>
                              <ul className="space-y-1">
                                {script.keyRetentionPoints.map((point, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Audio + Caption + Hashtags + Tags */}
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        {script.suggestedAudio && (
                          <div className="flex items-start gap-2">
                            <Music className="h-4 w-4 mt-0.5 text-pink-500" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Suggested Audio
                              </p>
                              <p className="text-sm">{script.suggestedAudio}</p>
                            </div>
                          </div>
                        )}

                        {script.captionSuggestion && (
                          <>
                            <Separator />
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-0.5 text-blue-500" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Caption Suggestion
                                </p>
                                <p className="text-sm mt-1">
                                  {script.captionSuggestion}
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        {script.hashtags && script.hashtags.length > 0 && (
                          <>
                            <Separator />
                            <div className="flex items-start gap-2">
                              <Hash className="h-4 w-4 mt-0.5 text-cyan-500" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                  Hashtags
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {script.hashtags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {script.tags && script.tags.length > 0 && (
                          <>
                            <Separator />
                            <div className="flex items-start gap-2">
                              <Hash className="h-4 w-4 mt-0.5 text-cyan-500" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                  Tags
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {script.tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ─── Raw JSON tab ─── */}
              <TabsContent value="raw">
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[calc(100vh-20rem)]">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* ─── History ─── */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Script History</CardTitle>
            <CardDescription>
              Previously generated scripts ({history.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {history.map((gen) => {
                  const inp = gen.input as Record<string, string>;
                  return (
                    <div
                      key={gen._id}
                      className="rounded-lg border p-3 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setResult(gen.output as ScriptResponse)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {inp?.topic || gen.type}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {inp?.contentType && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {inp.contentType}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(gen.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await historyApi.delete(gen._id);
                                if (res.success) {
                                  setHistory((prev) =>
                                    prev.filter((g) => g._id !== gen._id)
                                  );
                                  toast.success("Deleted");
                                }
                              } catch {
                                toast.error("Delete failed");
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {inp?.duration && `${inp.duration}s`}
                        {inp?.style && ` • ${inp.style}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Reusable detail row ─────────────────────────────────────────── */

function ScriptDetail({
  icon,
  label,
  value,
  badge,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: boolean;
  muted?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {badge ? (
          <Badge variant="outline" className="mt-1 text-sm font-semibold">
            {value}
          </Badge>
        ) : (
          <p className={`text-sm mt-0.5 ${muted ? "text-muted-foreground italic" : ""}`}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
