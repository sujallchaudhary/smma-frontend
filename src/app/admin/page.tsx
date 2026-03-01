"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  ShieldCheck,
  Users,
  Loader2,
  Save,
  UserCog,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, type AdminUser, type UserConfigData } from "@/lib/api";

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-2.5-pro-preview-06-05", label: "Gemini 2.5 Pro (Preview)" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash (Preview)" },
];

const DEFAULT_CONFIG: UserConfigData = {
  platforms: { instagram: false, linkedin: false, twitter: false, facebook: false },
  features: {
    postGenerator: true,
    scriptGenerator: true,
    imageGenerator: true,
    contentPackage: true,
    autopilot: true,
    calendar: true,
    chat: true,
  },
  apiKeys: { gemini: { useOwn: false }, cloudinary: { useOwn: false } },
  geminiModel: "gemini-2.0-flash",
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editConfig, setEditConfig] = useState<UserConfigData>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        toast.error(res.error || "Failed to load users");
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") fetchUsers();
  }, [user, fetchUsers]);

  const openConfigDialog = (u: AdminUser) => {
    setEditingUser(u);
    setEditConfig(u.config ? { ...DEFAULT_CONFIG, ...u.config } : { ...DEFAULT_CONFIG });
  };

  const handleSaveConfig = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await adminApi.updateUserConfig(editingUser._id, editConfig);
      if (res.success) {
        toast.success(`Configuration updated for ${editingUser.username}`);
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(res.error || "Failed to update config");
      }
    } catch {
      toast.error("Failed to update config");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async (userId: string) => {
    setToggling(userId);
    try {
      const res = await adminApi.toggleUser(userId);
      if (res.success) {
        toast.success("User status updated");
        fetchUsers();
      } else {
        toast.error(res.error || "Failed to toggle user");
      }
    } catch {
      toast.error("Failed to toggle user");
    } finally {
      setToggling(null);
    }
  };

  const updatePlatform = (platform: keyof UserConfigData["platforms"], value: boolean) => {
    setEditConfig((prev) => ({
      ...prev,
      platforms: { ...prev.platforms, [platform]: value },
    }));
  };

  const updateFeature = (feature: keyof UserConfigData["features"], value: boolean) => {
    setEditConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [feature]: value },
    }));
  };

  const updateApiKeyMode = (service: "gemini" | "cloudinary", useOwn: boolean) => {
    setEditConfig((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [service]: { useOwn } },
    }));
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage users, configure feature access, and control API key policies.
        </p>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Users
          </CardTitle>
          <CardDescription>
            {users.length} registered user{users.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                      {u.username?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{u.username}</p>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {u.role}
                        </Badge>
                        <Badge variant={u.isActive ? "outline" : "destructive"} className="text-xs">
                          {u.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Enabled platforms summary */}
                    <div className="hidden sm:flex items-center gap-1">
                      {u.config?.platforms?.instagram && <Badge variant="outline" className="text-xs">IG</Badge>}
                      {u.config?.platforms?.linkedin && <Badge variant="outline" className="text-xs">LI</Badge>}
                      {u.config?.platforms?.twitter && <Badge variant="outline" className="text-xs">TW</Badge>}
                      {u.config?.platforms?.facebook && <Badge variant="outline" className="text-xs">FB</Badge>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfigDialog(u)}
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button
                      variant={u.isActive ? "ghost" : "default"}
                      size="sm"
                      disabled={toggling === u._id || u.role === "admin"}
                      onClick={() => handleToggleUser(u._id)}
                      title={u.role === "admin" ? "Cannot disable admin" : u.isActive ? "Disable user" : "Enable user"}
                    >
                      {toggling === u._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : u.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Configure {editingUser?.username}
            </DialogTitle>
            <DialogDescription>
              Set platforms, features, and API key policies for this user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Platforms */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Platforms</h3>
              <div className="space-y-3">
                {(
                  [
                    ["instagram", "Instagram"],
                    ["linkedin", "LinkedIn"],
                    ["twitter", "Twitter / X"],
                    ["facebook", "Facebook"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`p-${key}`} className="text-sm">{label}</Label>
                    <Switch
                      id={`p-${key}`}
                      checked={editConfig.platforms[key]}
                      onCheckedChange={(v) => updatePlatform(key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Features</h3>
              <div className="space-y-3">
                {(
                  [
                    ["postGenerator", "Post Generator"],
                    ["scriptGenerator", "Script Generator"],
                    ["imageGenerator", "Image Generator"],
                    ["contentPackage", "Content Package"],
                    ["autopilot", "Autopilot"],
                    ["calendar", "Calendar"],
                    ["chat", "Chat / DM"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`f-${key}`} className="text-sm">{label}</Label>
                    <Switch
                      id={`f-${key}`}
                      checked={editConfig.features[key]}
                      onCheckedChange={(v) => updateFeature(key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* API Key Policies */}
            <div>
              <h3 className="text-sm font-semibold mb-1">API Key Policy</h3>
              <p className="text-xs text-muted-foreground mb-3">
                When disabled, the user will use default server keys from .env.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ak-gemini" className="text-sm">Gemini — use own key</Label>
                  <Switch
                    id="ak-gemini"
                    checked={editConfig.apiKeys.gemini.useOwn}
                    onCheckedChange={(v) => updateApiKeyMode("gemini", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ak-cloudinary" className="text-sm">Cloudinary — use own key</Label>
                  <Switch
                    id="ak-cloudinary"
                    checked={editConfig.apiKeys.cloudinary.useOwn}
                    onCheckedChange={(v) => updateApiKeyMode("cloudinary", v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Gemini Model */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Gemini Model</h3>
              <Select
                value={editConfig.geminiModel}
                onValueChange={(v) => setEditConfig((prev) => ({ ...prev, geminiModel: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Save */}
            <Button className="w-full" disabled={saving} onClick={handleSaveConfig}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
