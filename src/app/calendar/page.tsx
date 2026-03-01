"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays,
  Loader2,
  Plus,
  Clock,
  CalendarIcon,
  BarChart3,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  calendarApi,
  autopilotApi,
  type CreateCampaignParams,
  type SchedulePostParams,
} from "@/lib/api";
import { PlatformSelect } from "@/components/platform-select";
import { useUserConfig } from "@/components/user-config-provider";

interface PostRecord {
  _id: string;
  platform: string;
  status: string;
  content?: { caption?: string };
  createdAt?: string;
}

export default function CalendarPage() {
  const { enabledPlatforms } = useUserConfig();
  const [activeTab, setActiveTab] = useState("campaigns");

  // Campaigns
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CreateCampaignParams>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    platforms: [],
    frequency: "daily",
    autoGenerate: false,
    topics: [],
    tone: "professional",
    targetAudience: "",
  });
  const [topicInput, setTopicInput] = useState("");

  // Schedule
  const [scheduleForm, setScheduleForm] = useState<SchedulePostParams>({
    postId: "",
    scheduledDate: "",
    platform: "instagram",
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<
    Record<string, unknown>[]
  >([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // Available posts for scheduling
  const [availablePosts, setAvailablePosts] = useState<PostRecord[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Events & scan
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [scanLoading, setScanLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await calendarApi.listCampaigns();
      if (res.success) {
        const raw = res.data;
        const arr = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).campaigns)
          ? (raw as Record<string, unknown>).campaigns as Record<string, unknown>[]
          : [];
        setCampaigns(arr);
      }
    } catch {
      /* ignore */
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadScheduledPosts = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const res = await calendarApi.getScheduledPosts();
      if (res.success) {
        const raw = res.data;
        const arr = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).posts)
          ? (raw as Record<string, unknown>).posts as Record<string, unknown>[]
          : [];
        setScheduledPosts(arr);
      }
    } catch {
      /* ignore */
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await calendarApi.getUpcomingEvents(30);
      if (res.success) {
        const raw = res.data;
        const arr = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).events)
          ? (raw as Record<string, unknown>).events as Record<string, unknown>[]
          : [];
        setEvents(arr);
      }
    } catch {
      /* ignore */
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadAvailablePosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await autopilotApi.listPosts({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setAvailablePosts(res.data as unknown as PostRecord[]);
      }
    } catch {
      /* ignore */
    } finally {
      setPostsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadCampaigns();
    loadScheduledPosts();
    loadEvents();
    loadAvailablePosts();
  }, [loadCampaigns, loadScheduledPosts, loadEvents, loadAvailablePosts]);

  function toggleCampaignPlatform(platform: string) {
    setCampaignForm((prev) => {
      const current = prev.platforms || [];
      const next = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { ...prev, platforms: next };
    });
  }

  function addTopic() {
    const t = topicInput.trim();
    if (!t) return;
    setCampaignForm((prev) => ({
      ...prev,
      topics: [...(prev.topics || []), t],
    }));
    setTopicInput("");
  }

  function removeTopic(index: number) {
    setCampaignForm((prev) => ({
      ...prev,
      topics: (prev.topics || []).filter((_, i) => i !== index),
    }));
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignForm.name || !campaignForm.startDate || !campaignForm.endDate)
      return toast.error("Name and dates are required");
    if (!campaignForm.platforms || campaignForm.platforms.length === 0)
      return toast.error("Select at least one platform");
    setCreating(true);
    try {
      const res = await calendarApi.createCampaign(campaignForm);
      if (res.success) {
        toast.success("Campaign created!");
        setCreateDialogOpen(false);
        setCampaignForm({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          platforms: [],
          frequency: "daily",
          autoGenerate: false,
          topics: [],
          tone: "professional",
          targetAudience: "",
        });
        setTopicInput("");
        loadCampaigns();
      } else {
        toast.error(res.error || "Failed to create campaign");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.postId || !scheduleForm.scheduledDate)
      return toast.error("Post and date are required");
    setScheduling(true);
    try {
      const res = await calendarApi.schedulePost(scheduleForm);
      if (res.success) {
        toast.success("Post scheduled!");
        setScheduleForm({ postId: "", scheduledDate: "", platform: "instagram" });
        loadScheduledPosts();
        loadAvailablePosts();
      } else {
        toast.error(res.error || "Failed to schedule");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setScheduling(false);
    }
  }

  async function handleScan() {
    setScanLoading(true);
    try {
      const res = await calendarApi.scanCalendar(30);
      if (res.success) {
        setScanResult(res.data as Record<string, unknown>);
        toast.success("Calendar scanned!");
      } else {
        toast.error(res.error || "Scan failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setScanLoading(false);
    }
  }

  // Filter posts that can be scheduled (draft or generated, not already scheduled/published)
  const schedulablePosts = availablePosts.filter(
    (p) => p.status === "draft" || p.status === "generated"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-green-500" />
            Calendar &amp; Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan, schedule and manage content campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScan} disabled={scanLoading}>
            {scanLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Scan Calendar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="events">Upcoming Events</TabsTrigger>
          {scanResult && <TabsTrigger value="scan">Scan Results</TabsTrigger>}
        </TabsList>

        {/* ─── Campaigns ─── */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new content campaign
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name *</Label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) =>
                        setCampaignForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Q1 Product Launch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={campaignForm.description}
                      onChange={(e) =>
                        setCampaignForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={campaignForm.startDate}
                        onChange={(e) =>
                          setCampaignForm((p) => ({
                            ...p,
                            startDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Input
                        type="date"
                        value={campaignForm.endDate}
                        onChange={(e) =>
                          setCampaignForm((p) => ({
                            ...p,
                            endDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Platform multi-select */}
                  <div className="space-y-2">
                    <Label>Platforms *</Label>
                    <div className="flex flex-wrap gap-2">
                      {enabledPlatforms.map((p) => {
                        const selected = (campaignForm.platforms || []).includes(p.id);
                        return (
                          <Button
                            key={p.id}
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            onClick={() => toggleCampaignPlatform(p.id)}
                          >
                            {p.label}
                          </Button>
                        );
                      })}
                    </div>
                    {(campaignForm.platforms || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">Select at least one platform</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={campaignForm.frequency}
                        onValueChange={(v) =>
                          setCampaignForm((p) => ({ ...p, frequency: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select
                        value={campaignForm.tone}
                        onValueChange={(v) =>
                          setCampaignForm((p) => ({ ...p, tone: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Input
                      value={campaignForm.targetAudience}
                      onChange={(e) =>
                        setCampaignForm((p) => ({
                          ...p,
                          targetAudience: e.target.value,
                        }))
                      }
                      placeholder="e.g. SaaS founders"
                    />
                  </div>

                  {/* Topics */}
                  <div className="space-y-2">
                    <Label>Topics</Label>
                    <div className="flex gap-2">
                      <Input
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        placeholder="Add a topic and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTopic();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addTopic}>
                        Add
                      </Button>
                    </div>
                    {(campaignForm.topics || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(campaignForm.topics || []).map((t, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTopic(i)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Auto-generate toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Auto-Generate Content</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically generate posts for each topic/platform
                      </p>
                    </div>
                    <Switch
                      checked={campaignForm.autoGenerate || false}
                      onCheckedChange={(checked) =>
                        setCampaignForm((p) => ({ ...p, autoGenerate: checked }))
                      }
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Campaign
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {campaignsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No campaigns yet. Create your first one!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {campaigns.map((c, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {String(c.name || "Untitled")}
                      </CardTitle>
                      <Badge variant="outline">
                        {String(c.status || "active")}
                      </Badge>
                    </div>
                    <CardDescription>
                      {String(c.description || "")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {String(c.startDate || "").slice(0, 10)} →{" "}
                      {String(c.endDate || "").slice(0, 10)}
                    </div>
                    {Array.isArray(c.platforms) && c.platforms.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(c.platforms as string[]).map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {c.frequency && (
                      <p className="text-xs">Frequency: {String(c.frequency)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Schedule ─── */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Schedule a Post</CardTitle>
                <CardDescription>
                  Schedule a generated post for publishing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSchedule} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Post *</Label>
                    {postsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading posts...
                      </div>
                    ) : schedulablePosts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No posts available. Generate content first.
                      </p>
                    ) : (
                      <Select
                        value={scheduleForm.postId}
                        onValueChange={(v) => {
                          const selectedPost = schedulablePosts.find((p) => p._id === v);
                          setScheduleForm((prev) => ({
                            ...prev,
                            postId: v,
                            platform: selectedPost?.platform || prev.platform,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a post to schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          {schedulablePosts.map((post) => (
                            <SelectItem key={post._id} value={post._id}>
                              <span className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {post.platform}
                                </Badge>
                                <span className="truncate max-w-[200px]">
                                  {post.content?.caption?.slice(0, 50) || post._id}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled Date *</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleForm.scheduledDate}
                      onChange={(e) =>
                        setScheduleForm((p) => ({
                          ...p,
                          scheduledDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <PlatformSelect
                      value={scheduleForm.platform}
                      onValueChange={(v) =>
                        setScheduleForm((p) => ({ ...p, platform: v }))
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={scheduling || schedulablePosts.length === 0}
                  >
                    {scheduling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="mr-2 h-4 w-4" />
                    )}
                    Schedule Post
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <CardDescription>Upcoming scheduled content</CardDescription>
              </CardHeader>
              <CardContent>
                {scheduledLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : scheduledPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No posts scheduled yet.
                  </p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {scheduledPosts.map((p, i) => (
                        <div
                          key={i}
                          className="rounded-lg border p-3 text-sm space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge>{String(p.platform || "")}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {p.scheduledAt
                                ? new Date(String(p.scheduledAt)).toLocaleString()
                                : String(p.scheduledDate || "").slice(0, 16)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {(() => {
                              const content = p.content as Record<string, unknown> | undefined;
                              return content?.caption
                                ? String(content.caption).slice(0, 80)
                                : `Post ID: ${String(p._id || "")}`;
                            })()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Events ─── */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Next 30 days of activity</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming events.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {events.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-3 text-sm flex items-start gap-3"
                      >
                        <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {String(ev.title || ev.name || "Event")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ev.daysUntil != null
                              ? `In ${ev.daysUntil} days`
                              : String(ev.date || "").slice(0, 16)}
                            {ev.urgency ? ` — ${String(ev.urgency)}` : ""}
                          </p>
                          {ev.type && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {String(ev.type)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Scan ─── */}
        {scanResult && (
          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Scan Results</CardTitle>
                <CardDescription>
                  AI overview of your content calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(scanResult, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
