// Re-export sphere and astrology types
export * from "./sphere";
export * from "./astrology";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    tools_called?: string[];
    tokens_used?: number;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  gender?: string;
  birth_date?: string;
  birth_time?: string;
  birth_location?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  subscription_tier: string;
  natal_chart_data?: Record<string, unknown>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface WebSocketMessage {
  type: "message" | "welcome" | "typing" | "stream_start" | "stream_chunk" | "stream_end" | "tool_call" | "error";
  content?: string;
  needs_onboarding?: boolean;
  is_typing?: boolean;
  tool?: string;
  status?: "started" | "completed";
}
