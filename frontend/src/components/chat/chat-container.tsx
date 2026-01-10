"use client";

import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
  const {
    messages,
    isConnected,
    isTyping,
    isStreaming,
    streamingContent,
    error,
    send,
    activeToolCall,
  } = useWebSocket();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Connection indicator - Ultra subtle dot, top right */}
      <div className="absolute top-4 right-4 z-10">
        <div
          className={cn(
            "w-1 h-1 rounded-full transition-colors duration-500",
            isConnected ? "bg-gold/30" : "bg-muted-foreground/20 animate-pulse"
          )}
        />
      </div>

      {/* Error - Subtle, dismissible */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 text-xs text-destructive/80 bg-background/80 backdrop-blur-sm rounded">
          {error}
        </div>
      )}

      {/* Messages area - Full height, centered content */}
      <MessageList
        messages={messages}
        isTyping={isTyping}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        activeToolCall={activeToolCall}
        className="flex-1"
      />

      {/* Input area - Minimal, floating feel */}
      <ChatInput
        onSend={send}
        disabled={!isConnected}
      />
    </div>
  );
}
