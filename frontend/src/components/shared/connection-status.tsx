"use client";

import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-colors",
          isConnected ? "bg-success" : "bg-destructive animate-pulse"
        )}
      />
      <span className="text-xs text-muted-foreground/50">
        {isConnected ? "connected" : "connecting..."}
      </span>
    </div>
  );
}
