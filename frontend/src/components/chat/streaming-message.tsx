"use client";

import { cn } from "@/lib/utils";

interface StreamingMessageProps {
  content: string;
  className?: string;
}

export function StreamingMessage({ content, className }: StreamingMessageProps) {
  return (
    <div className={cn("message-enter text-left", className)}>
      <div className="archon-message archon-shimmer pl-4 font-serif text-cream/90 text-[15px] leading-relaxed archon-message-glow">
        <div className="whitespace-pre-wrap break-words streaming-cursor">
          {content}
        </div>
      </div>
    </div>
  );
}
