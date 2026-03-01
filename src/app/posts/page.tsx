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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Loader2,
  Send,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { autopilotApi, type PostRecord } from "@/lib/api";
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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  pending_review: { label: "Pending Review", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  published: { label: "Published", variant: "default", icon: CheckCircle2 },
  scheduled: { label: "Scheduled", variant: "outline", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-600",
  twitter: "bg-sky-500/10 text-sky-600",
  linkedin: "bg-blue-600/10 text-blue-700",
  facebook: "bg-indigo-500/10 text-indigo-600",
};

export default function PostsPage() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [filterStatus, filterPlatform]);

  async function loadPosts() {
    setLoading(true);
    try {
      const params: { status?: string; platform?: string; limit?: number } = { limit: 100 };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterPlatform !== "all") params.platform = filterPlatform;
      const res = await autopilotApi.listPosts(params);
      if (res.success) {
        setPosts((res.data ?? []) as PostRecord[]);
        setTotal(res.total ?? 0);
      }
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(postId: string) {
    setPublishingId(postId);
    try {
      const res = await autopilotApi.approveAndPublish(postId, { publish: true });
      if (res.success) {
        toast.success("Post published successfully!");
        loadPosts();
      } else {
        toast.error(res.error || "Publish failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleApprove(postId: string) {
    setPublishingId(postId);
    try {
      const res = await autopilotApi.approveAndPublish(postId, { publish: false });
      if (res.success) {
        toast.success("Post approved!");
        loadPosts();
      } else {
        toast.error(res.error || "Approve failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDelete(postId: string) {
    try {
      const res = await autopilotApi.deletePost(postId);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        setSelectedPost(null);
        toast.success("Post deleted");
      } else {
        toast.error(res.error || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  }

  const statusCounts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-emerald-500" />
            Post Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            View, approve and publish all your generated posts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPosts} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        {(["draft", "pending_review", "approved", "published", "scheduled"] as const).map((s) => {
          const cfg = statusConfig[s];
          return (
            <Card key={s}>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">{statusCounts[s] || 0}</p>
                <p className="text-xs text-muted-foreground">{cfg?.label || s}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Platform:</span>
              <div className="w-[160px]">
                <PlatformSelect
                  value={filterPlatform}
                  onValueChange={setFilterPlatform}
                  showAll
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Posts ({posts.length})</CardTitle>
          <CardDescription>
            Click a post to preview, or use the action buttons to approve/publish
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No posts found. Generate some content first!</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {posts.map((post) => {
                  const cfg = statusConfig[post.status] || statusConfig.draft;
                  const StatusIcon = cfg.icon;
                  const caption = post.content?.caption || "";
                  const preview = caption.slice(0, 140) + (caption.length > 140 ? "…" : "");
                  const isPublished = post.status === "published";
                  const isPublishing = publishingId === post._id;
                  const hasImages = post.images && post.images.length > 0;

                  return (
                    <div
                      key={post._id}
                      className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      {/* Thumbnail */}
                      {hasImages && (
                        <img
                          src={post.images![0].url}
                          alt=""
                          className="h-16 w-16 rounded-md border object-cover shrink-0 cursor-pointer"
                          onClick={() => setSelectedPost(post)}
                        />
                      )}

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-xs capitalize ${platformColors[post.platform] || ""}`}>
                            {post.platform}
                          </Badge>
                          <Badge variant={cfg.variant} className="text-xs gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {post.contentType}
                          </Badge>
                          {hasImages && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {post.images!.length} image{post.images!.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {timeAgo(post.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{post.topic}</p>
                        {preview && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {preview}
                          </p>
                        )}
                        {post.content?.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {post.content.hashtags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {post.content.hashtags.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{post.content.hashtags.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedPost(post)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isPublished && (
                          <Button
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePublish(post._id)}
                            disabled={isPublishing}
                            title="Approve & Publish"
                          >
                            {isPublishing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {isPublished && (
                          <Badge variant="default" className="text-[10px] px-1.5 justify-center">
                            Live
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(post._id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Post Preview Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Post Preview
              {selectedPost && (
                <>
                  <Badge className={`capitalize text-xs ${platformColors[selectedPost.platform] || ""}`}>
                    {selectedPost.platform}
                  </Badge>
                  <Badge variant={statusConfig[selectedPost.status]?.variant || "secondary"} className="text-xs">
                    {statusConfig[selectedPost.status]?.label || selectedPost.status}
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedPost?.topic}
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <ScrollArea className="flex-1 max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Package Images */}
                {selectedPost.images && selectedPost.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Images</p>
                    <div className="grid gap-3">
                      {selectedPost.images.map((img, i) => (
                        <div key={i} className="space-y-2">
                          <img
                            src={img.url}
                            alt={`Package image ${i + 1}`}
                            className="w-full rounded-lg border"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" asChild>
                              <a href={img.url} download={`post-image-${i + 1}.${img.format || "png"}`}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={img.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                )}

                {/* Caption */}
                {selectedPost.content?.caption && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caption</p>
                    <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed">
                      {selectedPost.content.caption}
                    </div>
                  </div>
                )}

                {/* Call to Action */}
                {selectedPost.content?.callToAction && (
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-500/5 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Call to Action</p>
                    <p className="text-sm font-medium">{selectedPost.content.callToAction}</p>
                  </div>
                )}

                {/* Hashtags */}
                {selectedPost.content?.hashtags?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.content.hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Content Type</p>
                    <p className="font-medium capitalize">{selectedPost.contentType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tone</p>
                    <p className="font-medium capitalize">{selectedPost.tone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Iterations</p>
                    <p className="font-medium">{selectedPost.iterations}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedPost.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedPost.publishedAt && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Published At</p>
                      <p className="font-medium">{new Date(selectedPost.publishedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <Separator />
                <div className="flex gap-2 pb-2">
                  {selectedPost.status !== "published" && (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                          handleApprove(selectedPost._id);
                          setSelectedPost(null);
                        }}
                        disabled={publishingId === selectedPost._id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          handlePublish(selectedPost._id);
                          setSelectedPost(null);
                        }}
                        disabled={publishingId === selectedPost._id}
                      >
                        {publishingId === selectedPost._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Publish Now
                      </Button>
                    </>
                  )}
                  {selectedPost.status === "published" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      This post has been published
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(selectedPost._id)}
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
