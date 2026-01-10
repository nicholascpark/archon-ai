"use client";

import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  size?: "sm" | "md" | "lg";
  isThinking?: boolean;
  className?: string;
}

export function AgentAvatar({ size = "md", isThinking = false, className }: AgentAvatarProps) {
  const sizeClasses = {
    sm: "w-5 h-5 text-xs",
    md: "w-7 h-7 text-sm",
    lg: "w-9 h-9 text-base",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        isThinking && "animate-pulse-soft",
        className
      )}
    >
      {/* Simple sigil - sun/star symbol */}
      <span className={cn(
        "sigil font-serif",
        isThinking && "animate-flicker"
      )}>
        &#9737;
      </span>
    </div>
  );
}
