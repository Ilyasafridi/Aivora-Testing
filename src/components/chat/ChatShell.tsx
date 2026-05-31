import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  createThread,
  deleteThread,
  getThreadMessages,
  listThreads,
  updateThread,
} from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { AivoraLogo } from "@/components/AivoraLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Send,
  Trash2,
  Pin,
  Star,
  Sparkles,
  Code2,
  Image as ImageIcon,
  Bot,
  Workflow,
  Search,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Thread = Awaited<ReturnType<typeof listThreads>>[number];

const MODES = [
  { id: "chat", label: "Chat", icon: Sparkles },
  { id: "research", label: "Research", icon: Search },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "automation", label: "Auto", icon: Workflow },
] as const;

const MODELS = [
  { id: "gemini", label: "Gemini" },
  { id: "gpt", label: "GPT" },
  { id: "claude", label: "Claude" },
  { id: "mistral", label: "Mistral" },
] as const;

const LOADING_PHRASES = [
  "Thinking…",
  "Analyzing…",
  "Searching…",
  "Generating…",
  "Building response…",
  "Optimizing answer…",
];

export function ChatShell({ threadId }: { threadId: string | null }) {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const update = useServerFn(updateThread);
  const remove = useServerFn(deleteThread);
  const fetchMessages = useServerFn(getThreadMessages);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("chat");
  const [model, setModel] = useState<(typeof MODELS)[number]["id"]>("gemini");
  const [input, setInput] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            body: { messages, threadId, model, mode, ...(body ?? {}) },
            headers,
          };
        },
      }),
    [threadId, model, mode],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: threadId ?? "new",
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Cycle loading phrases
  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length), 1400);
    return () => clearInterval(t);
  }, [isLoading]);

  // Load threads list
  const refreshThreads = async () => {
    const t = await list();
    setThreads(t);
  };
  useEffect(() => {
    refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages for current thread
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const { messages: stored } = await fetchMessages({ data: { threadId } });
        setMessages(
          stored.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            parts: [{ type: "text" as const, text: m.text }],
          })),
        );
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const onNew = async () => {
    const t = await create({ data: {} });
    await refreshThreads();
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    let tid = threadId;
    if (!tid) {
      const t = await create({ data: {} });
      tid = t.id;
      await refreshThreads();
      navigate({ to: "/chat/$threadId", params: { threadId: tid } });
    }
    setInput("");
    await sendMessage({ text });
    setTimeout(refreshThreads, 1500);
  };

  const onDelete = async (id: string) => {
    await remove({ data: { id } });
    await refreshThreads();
    if (id === threadId) navigate({ to: "/chat" });
  };

  const togglePin = async (t: Thread) => {
    await update({ data: { id: t.id, pinned: !t.pinned } });
    await refreshThreads();
  };
  const toggleFav = async (t: Thread) => {
    await update({ data: { id: t.id, favorite: !t.favorite } });
    await refreshThreads();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const filtered = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-screen w-full text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-border/40 bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border/40">
          <AivoraLogo size={28} />
          <span className="font-semibold tracking-tight">Aivora</span>
        </div>
        <div className="p-3">
          <Button onClick={onNew} className="w-full gap-2" variant="default">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <div className="px-3 pb-2">
          <Input
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background/40"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {filtered.map((t) => {
            const active = t.id === threadId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/40 text-muted-foreground",
                )}
                onClick={() =>
                  navigate({ to: "/chat/$threadId", params: { threadId: t.id } })
                }
              >
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(t);
                  }}
                  aria-label="Pin"
                >
                  <Pin
                    className={cn(
                      "h-3.5 w-3.5",
                      t.pinned ? "text-primary fill-primary" : "",
                    )}
                  />
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(t);
                  }}
                  aria-label="Favorite"
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      t.favorite ? "text-yellow-400 fill-yellow-400" : "",
                    )}
                  />
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4">No chats yet.</p>
          )}
        </div>
        <div className="border-t border-border/40 p-3">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 bg-background/40 backdrop-blur-xl">
          <div className="flex gap-1 overflow-x-auto">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all border",
                    active
                      ? "bg-primary/15 border-primary/40 text-foreground shadow-[0_0_20px_-5px_var(--primary)]"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as typeof model)}
            className="bg-background/60 border border-border/40 rounded-md text-xs px-2 py-1.5"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                <AivoraLogo size={56} />
                <h1 className="text-3xl font-semibold tracking-tight">
                  How can Aivora help today?
                </h1>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask anything. Switch modes for research, coding, images, agents, or
                  automations.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%] border",
                      m.role === "user"
                        ? "bg-primary/15 border-primary/30 text-foreground"
                        : "bg-background/40 border-border/40 backdrop-blur-md",
                    )}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{LOADING_PHRASES[phraseIdx]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={onSubmit} className="border-t border-border/40 p-4 bg-background/40 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <div className="group relative rounded-2xl border border-border/60 bg-background/60 backdrop-blur-xl focus-within:border-primary/60 focus-within:shadow-[0_0_40px_-10px_var(--primary)] transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Message Aivora…"
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm outline-none placeholder:text-muted-foreground min-h-[52px] max-h-40"
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => stop()}
                    aria-label="Stop"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Aivora can make mistakes. Verify important info.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}