import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  return <ChatShell threadId={threadId} />;
}