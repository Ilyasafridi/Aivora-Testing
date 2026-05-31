import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread, listThreads } from "@/lib/chat.functions";
import { ChatShell } from "@/components/chat/ChatShell";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);

  useEffect(() => {
    (async () => {
      const threads = await list();
      const first = threads[0];
      if (first) {
        navigate({ to: "/chat/$threadId", params: { threadId: first.id }, replace: true });
      } else {
        const t = await create({ data: {} });
        navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
      }
    })();
  }, [list, create, navigate]);

  return <ChatShell threadId={null} />;
}