"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [message, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className={cn("px-6 pb-8 pt-2", className)}>
      <div className="max-w-md mx-auto">
        <div className="relative">
          {/* Minimal input - just a line that expands */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "..." : "speak"}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full bg-transparent resize-none outline-none",
              "text-cream placeholder:text-muted-foreground/40",
              "font-serif text-[15px]",
              "py-3 px-0",
              "border-b border-border/30 focus:border-gold/30",
              "transition-colors duration-300",
              "min-h-[48px] max-h-[150px]",
              "disabled:opacity-30"
            )}
          />

          {/* Send hint - appears when there's content */}
          {message.trim() && (
            <div className="absolute right-0 bottom-3 text-xs text-muted-foreground/40">
              enter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
