"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, reconnectOnMount = false } = options;

  const token = useAuthStore((state) => state.token);
  const {
    messages,
    isConnected,
    isTyping,
    isStreaming,
    streamingContent,
    activeToolCall,
    error,
    connect,
    disconnect,
    send,
  } = useChatStore();

  const hasConnectedRef = useRef(false);

  // Auto-connect when token is available
  useEffect(() => {
    if (autoConnect && token && !isConnected && !hasConnectedRef.current) {
      if (reconnectOnMount || !hasConnectedRef.current) {
        console.log("Auto-connecting WebSocket...");
        hasConnectedRef.current = true;
        connect(token);
      }
    }
  }, [autoConnect, token, isConnected, connect, reconnectOnMount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount to keep connection alive
      // disconnect();
    };
  }, []);

  return {
    messages,
    isConnected,
    isTyping,
    isStreaming,
    streamingContent,
    activeToolCall,
    error,
    connect: () => token && connect(token),
    disconnect,
    send,
  };
}
