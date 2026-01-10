import { create } from "zustand";
import type { Message, WebSocketMessage } from "@/types";

interface ToolCall {
  tool: string;
  status: "started" | "completed";
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  isStreaming: boolean;
  streamingContent: string;
  activeToolCall: ToolCall | null;
  error: string | null;
  ws: WebSocket | null;

  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  send: (content: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}

const WS_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "ws://localhost:8000";

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  isStreaming: false,
  streamingContent: "",
  activeToolCall: null,
  error: null,
  ws: null,

  connect: (token: string) => {
    const { ws: existingWs } = get();
    if (existingWs) {
      existingWs.close();
    }

    const ws = new WebSocket(`${WS_BASE}/ws/chat?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      set({ isConnected: true, error: null, ws });
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      set({ isConnected: false, ws: null });

      // Attempt reconnect after a delay
      const { isConnected } = get();
      if (!isConnected) {
        console.log("Attempting reconnect...");
        setTimeout(() => {
          const currentWs = get().ws;
          if (!currentWs) {
            get().connect(token);
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      set({ error: "Connection error" });
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case "welcome":
            set((state) => ({
              messages: [
                ...state.messages,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: data.content || "",
                  timestamp: new Date(),
                },
              ],
            }));
            break;

          case "typing":
            set({ isTyping: data.is_typing ?? false });
            break;

          case "stream_start":
            set({ isStreaming: true, streamingContent: "" });
            break;

          case "stream_chunk":
            set((state) => ({
              streamingContent: state.streamingContent + (data.content || ""),
            }));
            break;

          case "stream_end":
            const { streamingContent } = get();
            if (streamingContent) {
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date(),
                  },
                ],
                isStreaming: false,
                streamingContent: "",
              }));
            }
            break;

          case "tool_call":
            set({
              activeToolCall: data.tool && data.status
                ? { tool: data.tool, status: data.status }
                : null,
            });
            if (data.status === "completed") {
              setTimeout(() => set({ activeToolCall: null }), 1000);
            }
            break;

          case "error":
            set({ error: data.content || "An error occurred" });
            break;
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };

    set({ ws });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
    set({ ws: null, isConnected: false });
  },

  send: (content: string) => {
    const { ws, isConnected } = get();

    if (!ws || !isConnected) {
      console.error("WebSocket not connected");
      return;
    }

    // Add user message to state
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: "user",
          content,
          timestamp: new Date(),
        },
      ],
    }));

    // Send to server
    ws.send(JSON.stringify({ type: "message", content }));
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
