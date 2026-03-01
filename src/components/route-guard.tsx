"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const PUBLIC_PATHS = ["/login", "/register"];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicPage) {
      router.replace("/login");
    } else if (user && isPublicPage) {
      router.replace("/");
    }
  }, [user, loading, isPublicPage, router]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not authenticated and on protected page → don't render (redirect happening)
  if (!user && !isPublicPage) return null;

  // Authenticated and on public page → don't render (redirect happening)
  if (user && isPublicPage) return null;

  return <>{children}</>;
}
