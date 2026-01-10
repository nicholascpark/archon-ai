"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "message-enter",
        isUser ? "text-right" : "text-left"
      )}
      data-role={message.role}
    >
      {/* Message content */}
      <div
        className={cn(
          "inline-block max-w-[85%] text-left",
          isUser && [
            "px-4 py-2.5 rounded bg-muted/50",
            "text-sepia text-sm",
          ],
          isAssistant && [
            // Dynamic gold styling for Archon's messages
            "archon-message archon-shimmer pl-4",
            "font-serif text-cream/90 text-[15px] leading-relaxed",
            "archon-message-glow",
          ],
          isStreaming && "streaming-cursor"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}
