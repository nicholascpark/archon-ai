"use client";

import { ChatContainer } from "@/components/chat/chat-container";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Chat container - Full screen, transparent to show celestial background */}
      <ChatContainer className="flex-1" />
    </div>
  );
}
