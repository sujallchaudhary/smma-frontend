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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { settingsApi, type UserConfigData } from "@/lib/api";

/**
 * Defines the services and their key fields for the UI.
 */
const SERVICE_CONFIG: {
  id: string;
  label: string;
  description: string;
  fields: { key: string; label: string; placeholder: string }[];
}[] = [
  {
    id: "gemini",
    label: "Gemini AI",
    description: "Google Gemini API for content generation and image creation",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "AIzaSy...",
      },
    ],
  },
  {
    id: "cloudinary",
    label: "Cloudinary",
    description: "Image hosting and CDN for generated images",
    fields: [
      { key: "cloudName", label: "Cloud Name", placeholder: "your-cloud-name" },
      { key: "apiKey", label: "API Key", placeholder: "123456789012345" },
      { key: "apiSecret", label: "API Secret", placeholder: "ABCDE..." },
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    description:
      "Instagram Graph API for publishing posts. Requires a Business or Creator account connected to a Facebook Page.",
    fields: [
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "IGQV... (long-lived page token)",
      },
      {
        key: "accountId",
        label: "Account ID",
        placeholder: "17841400123456789 (IG Business Account ID)",
      },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description:
      "LinkedIn Posts API — uses 3-legged OAuth. Set Organization ID (w_organization_social scope) for company posts, or Person ID (w_member_social scope) for personal posts.",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "86abc...",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "WPLj8...",
      },
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "AQV... (from OAuth token exchange)",
      },
      {
        key: "organizationId",
        label: "Organization ID (for company posts)",
        placeholder: "5515715 — needs w_organization_social scope",
      },
      {
        key: "personId",
        label: "Person ID (for personal posts)",
        placeholder: "abc_dEfgH — needs w_member_social scope",
      },
    ],
  },
  {
    id: "twitter",
    label: "Twitter / X",
    description: "Twitter API v2 with OAuth 1.0a for publishing tweets & threads",
    fields: [
      {
        key: "appKey",
        label: "API Key (Consumer Key)",
        placeholder: "Your Twitter App API Key...",
      },
      {
        key: "appSecret",
        label: "API Secret (Consumer Secret)",
        placeholder: "Your Twitter App API Secret...",
      },
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "User Access Token...",
      },
      {
        key: "accessSecret",
        label: "Access Token Secret",
        placeholder: "User Access Token Secret...",
      },
    ],
  },
];

const GEMINI_MODEL_LABELS: Record<string, string> = {
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-2.5-pro-preview-06-05": "Gemini 2.5 Pro (Preview)",
  "gemini-2.5-flash-preview-05-20": "Gemini 2.5 Flash (Preview)",
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, Record<string, string>>>({});
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [userConfig, setUserConfig] = useState<UserConfigData | null>(null);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);

  // Load config + keys on mount
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // Fetch user config and keys in parallel
      const [configRes, keysRes] = await Promise.all([
        settingsApi.getMyConfig(),
        settingsApi.getAllKeys(),
      ]);

      // Determine allowed services from config
      let allowed = SERVICE_CONFIG.map((s) => s.id); // default: all
      if (configRes.success && configRes.data) {
        const cfg = configRes.data;
        setUserConfig(cfg);
        allowed = [];
        if (cfg.apiKeys?.gemini?.useOwn) allowed.push("gemini");
        if (cfg.apiKeys?.cloudinary?.useOwn) allowed.push("cloudinary");
        if (cfg.platforms?.instagram) allowed.push("instagram");
        if (cfg.platforms?.linkedin) allowed.push("linkedin");
        if (cfg.platforms?.twitter) allowed.push("twitter");
      }
      setAllowedServices(allowed);

      // Process keys
      if (keysRes.success && keysRes.data) {
        const data = keysRes.data as Record<string, { configured: boolean; keys: Record<string, string> }>;
        const newConfigured: Record<string, boolean> = {};
        const newMasked: Record<string, Record<string, string>> = {};
        const newForms: Record<string, Record<string, string>> = {};

        for (const svc of SERVICE_CONFIG) {
          const svcData = data[svc.id];
          newConfigured[svc.id] = svcData?.configured ?? false;
          newMasked[svc.id] = svcData?.keys ?? {};
          newForms[svc.id] = {};
          for (const f of svc.fields) {
            newForms[svc.id][f.key] = "";
          }
        }

        setConfigured(newConfigured);
        setMaskedKeys(newMasked);
        setForms(newForms);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  function updateField(service: string, field: string, value: string) {
    setForms((prev) => ({
      ...prev,
      [service]: { ...prev[service], [field]: value },
    }));
  }

  async function handleSave(serviceId: string) {
    const fields = forms[serviceId];
    // Only send non-empty fields
    const toSend: Record<string, string> = {};
    let hasValue = false;
    for (const [k, v] of Object.entries(fields)) {
      if (v.trim()) {
        toSend[k] = v.trim();
        hasValue = true;
      }
    }
    if (!hasValue) {
      toast.error("Please enter at least one key value");
      return;
    }

    setSaving(serviceId);
    try {
      const res = await settingsApi.upsertKeys(serviceId, toSend);
      if (res.success) {
        toast.success(`${serviceId} keys saved & encrypted`);
        // Clear form inputs and reload masked values
        setForms((prev) => ({
          ...prev,
          [serviceId]: Object.fromEntries(
            Object.keys(prev[serviceId]).map((k) => [k, ""])
          ),
        }));
        await loadAll();
      } else {
        toast.error(res.error || "Failed to save keys");
      }
    } catch {
      toast.error("Network error while saving keys");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(serviceId: string) {
    setSaving(serviceId);
    try {
      const res = await settingsApi.deleteKeys(serviceId);
      if (res.success) {
        toast.success(`${serviceId} keys removed`);
        await loadAll();
      } else {
        toast.error(res.error || "Failed to remove keys");
      }
    } catch {
      toast.error("Network error while removing keys");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          API Key Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your platform API keys. Keys are encrypted with AES-256-GCM
          before being stored in the database.
        </p>
      </div>

      {/* Gemini Model Info */}
      {userConfig && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm">
              <span className="text-muted-foreground">Gemini model: </span>
              <span className="font-medium">
                {GEMINI_MODEL_LABELS[userConfig.geminiModel] || userConfig.geminiModel}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {allowedServices.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No services have been enabled for your account. Contact your admin to configure access.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Service cards — only show allowed services */}
      <div className="grid gap-6">
        {SERVICE_CONFIG.filter((svc) => allowedServices.includes(svc.id)).map((svc) => (
          <Card key={svc.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {svc.label}
                    {configured[svc.id] ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Not configured
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{svc.description}</CardDescription>
                </div>
                {configured[svc.id] && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(svc.id)}
                    disabled={saving === svc.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Show current masked values if configured */}
              {configured[svc.id] && maskedKeys[svc.id] && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Current stored values (masked):
                  </p>
                  {svc.fields.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-muted-foreground w-28">
                        {f.label}:
                      </span>
                      <span className="font-mono">
                        {maskedKeys[svc.id]?.[f.key] || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Input fields */}
              {svc.fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`${svc.id}-${f.key}`}>{f.label}</Label>
                  <div className="relative">
                    <Input
                      id={`${svc.id}-${f.key}`}
                      type={visibility[`${svc.id}-${f.key}`] ? "text" : "password"}
                      placeholder={
                        configured[svc.id]
                          ? "Enter new value to update..."
                          : f.placeholder
                      }
                      value={forms[svc.id]?.[f.key] ?? ""}
                      onChange={(e) =>
                        updateField(svc.id, f.key, e.target.value)
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() =>
                        setVisibility((prev) => ({
                          ...prev,
                          [`${svc.id}-${f.key}`]: !prev[`${svc.id}-${f.key}`],
                        }))
                      }
                    >
                      {visibility[`${svc.id}-${f.key}`] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                onClick={() => handleSave(svc.id)}
                disabled={saving === svc.id}
                className="gap-2"
              >
                {saving === svc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {configured[svc.id] ? "Update Keys" : "Save Keys"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
