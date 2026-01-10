"use client";

import { AuthGuard } from "@/components/auth/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // WebSocket connection is handled by ChatContainer, not here
  // to avoid duplicate connections

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-background">
        {children}
      </div>
    </AuthGuard>
  );
}
