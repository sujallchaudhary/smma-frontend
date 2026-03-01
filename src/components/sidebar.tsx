"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import {
  PenLine,
  Video,
  ImageIcon,
  Package,
  CalendarDays,
  MessageCircle,
  LayoutDashboard,
  Rocket,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUserConfig, type FeatureKey } from "@/components/user-config-provider";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; feature?: FeatureKey }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/autopilot", label: "Autopilot", icon: Rocket, feature: "autopilot" },
  { href: "/content", label: "Post Generator", icon: PenLine, feature: "postGenerator" },
  { href: "/scripts", label: "Script Generator", icon: Video, feature: "scriptGenerator" },
  { href: "/images", label: "Image Generator", icon: ImageIcon, feature: "imageGenerator" },
  { href: "/package", label: "Content Package", icon: Package, feature: "contentPackage" },
  { href: "/posts", label: "Post Manager", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, feature: "calendar" },
  { href: "/chat", label: "Chat / DM", icon: MessageCircle, feature: "chat" },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isFeatureEnabled } = useUserConfig();
  const [open, setOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.feature || isFeatureEnabled(item.feature)
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 px-5 font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            S
          </div>
          <span className="text-lg">SMMA AI</span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <>
              <Separator className="my-2" />
              {adminNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <Separator />
        <div className="px-3 py-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
              {user?.name?.charAt(0) || <User className="h-4 w-4" />}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-3 px-3 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
