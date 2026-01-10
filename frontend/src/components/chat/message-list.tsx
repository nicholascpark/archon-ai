"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { StreamingMessage } from "./streaming-message";
import { TypingIndicator } from "./typing-indicator";
import type { Message } from "@/types";

interface ToolCall {
  tool: string;
  status: "started" | "completed";
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  isStreaming: boolean;
  streamingContent: string;
  activeToolCall?: ToolCall | null;
  className?: string;
}

// Map tool names to friendly labels (lowercase)
const TOOL_LABELS: Record<string, string> = {
  // Core astrology
  get_current_transits: "reading transits",
  analyze_synastry: "analyzing compatibility",
  search_chart_memory: "searching chart",
  // Timing tools
  get_moon_phase: "checking moon phase",
  get_retrograde_planets: "checking retrogrades",
  get_solar_return: "reading your year ahead",
  // Chart analysis
  get_planetary_dignities: "analyzing strengths",
  get_aspect_patterns: "finding patterns",
  // Profile & memory
  store_user_memory: "remembering",
  search_user_memories: "recalling",
  update_user_profile: "updating profile",
  get_onboarding_status: "checking profile",
};

export function MessageList({
  messages,
  isTyping,
  isStreaming,
  streamingContent,
  activeToolCall,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages, streaming content, or tool calls
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, isTyping, activeToolCall]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 overflow-y-auto px-6 py-8",
        className
      )}
    >
      <div className="max-w-md mx-auto space-y-6">
        {/* Empty state - Minimal, mystical */}
        {messages.length === 0 && !isTyping && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
            <span className="sigil text-3xl mb-6 animate-float">&#9737;</span>
            <p className="font-serif text-sepia/40 text-sm">
              the stars await your inquiry
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Tool call indicator - gold accent */}
        {activeToolCall && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm">
            <span className="archon-sigil animate-spin-slow">&#9788;</span>
            <span className="font-serif italic text-gold-soft/80">
              {TOOL_LABELS[activeToolCall.tool] || activeToolCall.tool}
              {activeToolCall.status === "started" && "..."}
              {activeToolCall.status === "completed" && " ✓"}
            </span>
          </div>
        )}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div data-streaming="true">
            <StreamingMessage content={streamingContent} />
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && !activeToolCall && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
