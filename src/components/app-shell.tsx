"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Sidebar } from "@/components/sidebar";

const PUBLIC_PATHS = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const showSidebar = !loading && user && !isPublicPage;

  return (
    <RouteGuard>
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "min-h-screen md:pl-64" : "min-h-screen"}>
        <div
          className={
            showSidebar
              ? "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
              : ""
          }
        >
          {children}
        </div>
      </main>
    </RouteGuard>
  );
}
