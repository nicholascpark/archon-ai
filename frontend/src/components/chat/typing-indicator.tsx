"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("message-enter text-left", className)}>
      <div className="flex items-center gap-1.5 py-2">
        <span
          className="w-1 h-1 rounded-full bg-gold/50 animate-typing"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1 h-1 rounded-full bg-gold/50 animate-typing"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="w-1 h-1 rounded-full bg-gold/50 animate-typing"
          style={{ animationDelay: "400ms" }}
        />
      </div>
    </div>
  );
}
