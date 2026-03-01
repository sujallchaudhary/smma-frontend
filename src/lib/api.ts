const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("smma_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  // If we get a 401, clear stored auth and redirect to login
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("smma_token");
      localStorage.removeItem("smma_user");
      // Only redirect if not already on login/register page
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login";
      }
    }
    return { success: false, error: "Session expired. Please log in again." };
  }

  return res.json();
}

// ─── Content API ─────────────────────────────────────────────────────

export interface GeneratePostParams {
  platform: string;
  topic: string;
  tone?: string;
  length?: string;
  targetAudience?: string;
  contentType?: string;
  linkedinTarget?: "person" | "organization";
}

export interface GenerateScriptParams {
  contentType: string;
  topic: string;
  duration?: number;
  style?: string;
  targetAudience?: string;
  niche?: string;
}

export interface GenerateImageParams {
  prompt: string;
  platform?: string;
  style?: string;
  aspectRatio?: string;
  brandColors?: string;
  mood?: string;
}

export interface GeneratePackageParams {
  platform: string;
  topic: string;
  tone?: string;
  targetAudience?: string;
  imageStyle?: string;
}

export interface FeedbackParams {
  postId: string;
  feedback: string;
}

export const contentApi = {
  generatePost: (params: GeneratePostParams) =>
    request("/api/content/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  generateScript: (params: GenerateScriptParams) =>
    request("/api/content/script", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  generateImage: (params: GenerateImageParams) =>
    request("/api/content/image", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  generatePackage: (params: GeneratePackageParams) =>
    request("/api/content/package", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  submitFeedback: (params: FeedbackParams) =>
    request("/api/content/feedback", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getHistory: (id: string) => request(`/api/content/history/${id}`),
};

// ─── Calendar API ────────────────────────────────────────────────────

export interface CreateCampaignParams {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  platforms?: string[];
  frequency?: string;
  autoGenerate?: boolean;
  topics?: string[];
  tone?: string;
  targetAudience?: string;
}

export interface SchedulePostParams {
  postId: string;
  scheduledDate: string;
  platform: string;
}

export const calendarApi = {
  createCampaign: (params: CreateCampaignParams) =>
    request("/api/calendar/campaign", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  listCampaigns: (status?: string) =>
    request(`/api/calendar/campaigns${status ? `?status=${status}` : ""}`),

  getUpcomingEvents: (daysAhead = 30) =>
    request(`/api/calendar/upcoming-events?daysAhead=${daysAhead}`),

  schedulePost: (params: SchedulePostParams) =>
    request("/api/calendar/schedule", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getScheduledPosts: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    return request(`/api/calendar/scheduled?${q.toString()}`);
  },

  reschedulePost: (id: string, newDate: string) =>
    request(`/api/calendar/reschedule/${id}`, {
      method: "PUT",
      body: JSON.stringify({ newDate }),
    }),

  scanCalendar: (daysAhead = 30) =>
    request(`/api/calendar/scan?daysAhead=${daysAhead}`),
};

// ─── Chat API ────────────────────────────────────────────────────────

export interface ChatRespondParams {
  userId: string;
  message: string;
  platform?: string;
  userName?: string;
  brandContext?: string;
  tone?: string;
}

export const chatApi = {
  respond: (params: ChatRespondParams) =>
    request("/api/chat/respond", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getHistory: (userId: string, platform = "instagram") =>
    request(`/api/chat/history/${userId}?platform=${platform}`),
};

// ─── System API ──────────────────────────────────────────────────────

export const systemApi = {
  health: () => request("/health"),
  docs: () => request("/api"),
};

// ─── Autopilot API (Multi-Platform, Approve/Publish, Full Automation) ─

export interface MultiPlatformGenerateParams {
  platforms: string[];
  topic: string;
  tone?: string;
  length?: string;
  targetAudience?: string;
  contentType?: string;
  linkedinTarget?: "person" | "organization";
}

export interface MultiPlatformImageParams {
  platforms: string[];
  prompt: string;
  style?: string;
  brandColors?: string;
  mood?: string;
}

export interface MultiPlatformPackageParams {
  platforms: string[];
  topic: string;
  tone?: string;
  targetAudience?: string;
  imageStyle?: string;
}

export interface MultiPlatformScriptParams {
  contentTypes: string[];
  topic: string;
  duration?: number;
  style?: string;
  targetAudience?: string;
  niche?: string;
}

export interface AutopilotRunParams {
  platforms: string[];
  topic: string;
  tone?: string;
  targetAudience?: string;
  imageStyle?: string;
  autoPublish?: boolean;
  refinementIterations?: number;
  linkedinTarget?: "person" | "organization";
}

export interface ApprovePublishParams {
  publish?: boolean;
}

export interface BulkPublishParams {
  postIds: string[];
}

export interface PlatformStatus {
  [platform: string]: { configured: boolean };
}

export interface PostRecord {
  _id: string;
  userId: string;
  platform: string;
  contentType: string;
  topic: string;
  tone: string;
  targetAudience: string;
  content: {
    caption: string;
    hashtags: string[];
    callToAction: string;
    mediaUrls: string[];
  };
  images?: Array<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
  }>;
  status: string;
  iterations: number;
  linkedinTarget?: string;
  publishedAt?: string;
  publishResult?: unknown;
  createdAt: string;
  updatedAt: string;
}

export const autopilotApi = {
  // ─── Multi-Platform Generation ───────────────────────────────────

  /** Generate posts for multiple platforms at once */
  multiGenerate: (params: MultiPlatformGenerateParams) =>
    request("/api/autopilot/multi-generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Generate images for multiple platforms at once */
  multiImage: (params: MultiPlatformImageParams) =>
    request("/api/autopilot/multi-image", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Generate content packages for multiple platforms */
  multiPackage: (params: MultiPlatformPackageParams) =>
    request("/api/autopilot/multi-package", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Generate scripts for multiple content types */
  multiScript: (params: MultiPlatformScriptParams) =>
    request("/api/autopilot/multi-script", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // ─── Approve & Publish ───────────────────────────────────────────

  /** Approve a post and optionally publish it immediately */
  approveAndPublish: (postId: string, params: ApprovePublishParams = {}) =>
    request(`/api/autopilot/approve/${postId}`, {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Publish a specific post to its platform */
  publishPost: (postId: string) =>
    request(`/api/autopilot/publish/${postId}`, {
      method: "POST",
    }),

  /** Publish multiple posts at once */
  bulkPublish: (params: BulkPublishParams) =>
    request("/api/autopilot/bulk-publish", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // ─── Full Autopilot ──────────────────────────────────────────────

  /** Run full autopilot: research → generate → iterate → publish */
  run: (params: AutopilotRunParams) =>
    request("/api/autopilot/run", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Check platform integration status */
  getStatus: () => request<PlatformStatus>("/api/autopilot/status"),

  /** List all posts for current user */
  listPosts: (params?: { status?: string; platform?: string; limit?: number; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.platform) q.set("platform", params.platform);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.page) q.set("page", String(params.page));
    return request<PostRecord[]>(`/api/autopilot/posts?${q.toString()}`);
  },

  /** Delete a post */
  deletePost: (postId: string) =>
    request(`/api/autopilot/posts/${postId}`, { method: "DELETE" }),
};

// ─── History / Generations API ───────────────────────────────────────

export interface GenerationRecord {
  _id: string;
  type: "post" | "script" | "image" | "package";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  images: Array<{
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
  }>;
  status: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationStats {
  post: number;
  script: number;
  image: number;
  package: number;
  total: number;
}

export const historyApi = {
  /** List generations with optional type filter */
  getGenerations: (type?: string, limit = 20, page = 1) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    q.set("limit", String(limit));
    q.set("page", String(page));
    return request<GenerationRecord[]>(
      `/api/content/generations?${q.toString()}`
    );
  },

  /** Get generation counts by type */
  getStats: () => request<GenerationStats>("/api/content/generations/stats"),

  /** Get a single generation */
  getById: (id: string) =>
    request<GenerationRecord>(`/api/content/generations/${id}`),

  /** Delete a generation */
  delete: (id: string) =>
    request(`/api/content/generations/${id}`, { method: "DELETE" }),

  /** Claim orphaned records (old records without userId) for the current user */
  claimOrphaned: () =>
    request("/api/content/generations/claim", { method: "POST" }),
};

// ─── Settings / API Keys API ─────────────────────────────────────────

export interface ServiceKeys {
  configured: boolean;
  keys: Record<string, string>;
}

export interface AllKeysResponse {
  [service: string]: ServiceKeys;
}

export const settingsApi = {
  /** Get current user's feature config (platforms, keys, gemini model) */
  getMyConfig: () => request<UserConfigData>("/api/settings/my-config"),

  /** Get all services with masked key values */
  getAllKeys: () => request<AllKeysResponse>("/api/settings/keys"),

  /** Upsert keys for a specific service */
  upsertKeys: (service: string, keys: Record<string, string>) =>
    request(`/api/settings/keys/${service}`, {
      method: "PUT",
      body: JSON.stringify({ keys }),
    }),

  /** Delete all keys for a service */
  deleteKeys: (service: string) =>
    request(`/api/settings/keys/${service}`, { method: "DELETE" }),

  /** Verify if a service is configured */
  verifyKeys: (service: string) =>
    request<{ configured: boolean }>(`/api/settings/keys/${service}/verify`),
};

// ─── Admin API (Admin-only) ──────────────────────────────────────────

export interface UserConfigData {
  platforms: {
    instagram: boolean;
    linkedin: boolean;
    twitter: boolean;
    facebook: boolean;
  };
  features: {
    postGenerator: boolean;
    scriptGenerator: boolean;
    imageGenerator: boolean;
    contentPackage: boolean;
    autopilot: boolean;
    calendar: boolean;
    chat: boolean;
  };
  apiKeys: {
    gemini: { useOwn: boolean };
    cloudinary: { useOwn: boolean };
  };
  geminiModel: string;
}

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  config: UserConfigData | null;
}

export const adminApi = {
  /** List all users with their configs */
  listUsers: () => request<AdminUser[]>("/api/admin/users"),

  /** Get a user's config */
  getUserConfig: (userId: string) =>
    request<UserConfigData>(`/api/admin/users/${userId}/config`),

  /** Update a user's config */
  updateUserConfig: (userId: string, config: Partial<UserConfigData>) =>
    request(`/api/admin/users/${userId}/config`, {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  /** Toggle user active/inactive */
  toggleUser: (userId: string) =>
    request(`/api/admin/users/${userId}/toggle`, { method: "PATCH" }),
};
