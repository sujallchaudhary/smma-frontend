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
import {
  FileText,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  contentApi,
  historyApi,
  autopilotApi,
  type GeneratePostParams,
  type GenerationRecord,
} from "@/lib/api";
import { PlatformSelect } from "@/components/platform-select";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ContentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // feedback
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState<GeneratePostParams>({
    platform: "instagram",
    topic: "",
    tone: "professional",
    length: "medium",
    targetAudience: "",
    contentType: "post",
  });

  const update = (key: keyof GeneratePostParams, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    // Claim any orphaned records from before per-user tracking, then load history
    historyApi.claimOrphaned().catch(() => {}).finally(() => loadHistory());
  }, []);

  async function loadHistory() {
    try {
      const res = await historyApi.getGenerations("post", 20);
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
      const res = await contentApi.generatePost(form);
      if (res.success) {
        setResult(res.data as Record<string, unknown>);
        toast.success("Post generated successfully!");
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

  async function handleFeedback() {
    if (!feedback.trim() || !result) return;
    setFeedbackLoading(true);
    try {
      const postId =
        (result as Record<string, unknown>)?.postId ||
        (result as Record<string, unknown>)?.id ||
        "";
      const res = await contentApi.submitFeedback({
        postId: String(postId),
        feedback,
      });
      if (res.success) {
        setResult(res.data as Record<string, unknown>);
        setFeedback("");
        toast.success("Content refined with feedback!");
      } else {
        toast.error(res.error || "Feedback failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setFeedbackLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePublish() {
    const postId =
      (result as Record<string, unknown>)?.postId ||
      (result as Record<string, unknown>)?.id ||
      (result as Record<string, unknown>)?._id ||
      "";
    if (!postId) return toast.error("No post ID found — generate a post first");
    setPublishing(true);
    try {
      const res = await autopilotApi.approveAndPublish(String(postId), { publish: true });
      if (res.success) {
        toast.success("Post approved & published!");
      } else {
        toast.error(res.error || "Publish failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPublishing(false);
    }
  }

  // ─── Extract fields from the nested response ───
  const contentObj = (result as Record<string, Record<string, unknown>>)?.content;
  const rawObj = (result as Record<string, Record<string, unknown>>)?.rawContent;

  const caption: string =
    (typeof contentObj === "object" && contentObj
      ? String(contentObj.caption || "")
      : "") ||
    (typeof rawObj === "object" && rawObj
      ? String(rawObj.caption || "")
      : "") ||
    (typeof result?.caption === "string" ? result.caption as string : "") ||
    (typeof result?.text === "string" ? result.text as string : "") ||
    (typeof result?.content === "string" ? result.content as string : "");

  const hashtags: string[] =
    (contentObj && Array.isArray(contentObj.hashtags)
      ? contentObj.hashtags
      : null) ||
    (rawObj && Array.isArray(rawObj.hashtags) ? rawObj.hashtags : null) ||
    (Array.isArray(result?.hashtags) ? (result.hashtags as string[]) : []);

  const callToAction: string =
    (contentObj && typeof contentObj.callToAction === "string"
      ? contentObj.callToAction
      : "") ||
    (rawObj && typeof rawObj.callToAction === "string"
      ? rawObj.callToAction
      : "");

  const hookLine: string =
    rawObj && typeof rawObj.hookLine === "string" ? rawObj.hookLine : "";

  const suggestedImage: string =
    rawObj && typeof rawObj.suggestedImageDescription === "string"
      ? rawObj.suggestedImageDescription
      : "";

  const platformLabel: string =
    typeof result?.platform === "string" ? (result.platform as string) : "";
  const statusLabel: string =
    typeof result?.status === "string" ? (result.status as string) : "";
  const charCount =
    contentObj && typeof contentObj.characterCount === "number"
      ? contentObj.characterCount
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-500" />
            Post Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate platform-optimized social media posts
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
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set your post parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <PlatformSelect
                    value={form.platform}
                    onValueChange={(v) => update("platform", v)}
                    extraPlatforms={["threads"]}
                  />
                </div>

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
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="thread">Thread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.platform === "linkedin" && (
                <div className="space-y-2">
                  <Label>Publish As</Label>
                  <Select
                    value={form.linkedinTarget || "person"}
                    onValueChange={(v) => update("linkedinTarget", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Personal Profile</SelectItem>
                      <SelectItem value="organization">Organization Page</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Personal requires <code>w_member_social</code> scope &amp; Person ID. Organization requires <code>w_organization_social</code> scope &amp; Organization ID.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g. Benefits of morning routines for entrepreneurs"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                      <SelectItem value="inspirational">
                        Inspirational
                      </SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Length</Label>
                  <Select
                    value={form.length}
                    onValueChange={(v) => update("length", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  value={form.targetAudience}
                  onChange={(e) => update("targetAudience", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Post"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ─── Result ─── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>AI-generated post output</CardDescription>
            </div>
            {caption && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(caption)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <p className="text-muted-foreground text-sm">
                Configure and generate a post to see results here.
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {result && (
              <ScrollArea className="h-[460px]">
                <div className="space-y-4">
                  {/* Platform & Status badges */}
                  {(platformLabel || statusLabel) && (
                    <div className="flex items-center gap-2">
                      {platformLabel && (
                        <Badge variant="default" className="capitalize">
                          {platformLabel}
                        </Badge>
                      )}
                      {statusLabel && (
                        <Badge variant="outline" className="capitalize">
                          {statusLabel}
                        </Badge>
                      )}
                      {charCount > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {charCount} characters
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hook line */}
                  {hookLine && (
                    <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-500/5 p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Hook</p>
                      <p className="text-sm font-medium">{hookLine}</p>
                    </div>
                  )}

                  {/* Caption / Main content */}
                  {caption && (
                    <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed">
                      {caption}
                    </div>
                  )}

                  {/* Call to Action */}
                  {callToAction && (
                    <div className="rounded-lg border-l-4 border-green-500 bg-green-500/5 p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Call to Action</p>
                      <p className="text-sm font-medium">{callToAction}</p>
                    </div>
                  )}

                  {/* Hashtags */}
                  {hashtags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hashtags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {hashtags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => copyToClipboard(tag)}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => copyToClipboard(hashtags.join(" "))}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy all hashtags
                      </Button>
                    </div>
                  )}

                  {/* Suggested image description */}
                  {suggestedImage && (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-dashed p-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">📷 Suggested Image</p>
                        <p className="text-sm text-muted-foreground">{suggestedImage}</p>
                      </div>
                    </>
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
                        Approve &amp; Publish to {platformLabel || form.platform}
                      </>
                    )}
                  </Button>
                </div>
              </ScrollArea>
            )}
          </CardContent>

          {result && (
            <>
              <Separator />
              <CardContent className="pt-4">
                <Label className="mb-2 block">Refine with feedback</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="e.g. Make it shorter and add a CTA"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                  />
                  <Button
                    variant="outline"
                    disabled={feedbackLoading || !feedback.trim()}
                    onClick={handleFeedback}
                    className="shrink-0"
                  >
                    {feedbackLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ─── History ─── */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Post History</CardTitle>
            <CardDescription>
              Previously generated posts ({history.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {history.map((gen) => {
                  const inp = gen.input as Record<string, string>;
                  const out = gen.output as Record<string, unknown>;
                  const contentInner = out?.content as Record<string, unknown> | undefined;
                  const rawInner = out?.rawContent as Record<string, unknown> | undefined;
                  const previewText =
                    (typeof contentInner === "object" && contentInner?.caption
                      ? String(contentInner.caption)
                      : "") ||
                    (typeof rawInner === "object" && rawInner?.caption
                      ? String(rawInner.caption)
                      : "") ||
                    (typeof out?.caption === "string" ? String(out.caption) : "") ||
                    (typeof out?.text === "string" ? String(out.text) : "") ||
                    (typeof out?.content === "string" ? String(out.content) : "");
                  const preview = previewText.slice(0, 120) + (previewText.length > 120 ? "…" : "");

                  return (
                    <div
                      key={gen._id}
                      className="rounded-lg border p-3 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setResult(out)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {inp?.topic || gen.type}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {inp?.platform && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {inp.platform}
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
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {preview}
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
