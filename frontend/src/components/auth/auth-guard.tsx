"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Don't do anything until hydration is complete
    if (!hasHydrated) return;

    // If we have a token but no user, try to fetch
    if (token && !user) {
      fetchUser().catch(() => {
        console.log("Auth: Backend unavailable, allowing dev access");
      });
    }

    // If no token after hydration, redirect to login
    if (!token) {
      router.replace("/login");
    }
  }, [hasHydrated, token, user, router, fetchUser]);

  // Show loading until hydrated
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
          <p className="text-muted-foreground text-sm font-serif">entering...</p>
        </div>
      </div>
    );
  }

  // After hydration, check token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
          <p className="text-muted-foreground text-sm font-serif">redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
