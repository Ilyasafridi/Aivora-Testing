import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  messages?: UIMessage[];
  threadId?: string;
  model?: string;
  mode?: string;
};

const MODEL_MAP: Record<string, string> = {
  gpt: "openai/gpt-5-mini",
  claude: "openai/gpt-5", // Claude not on gateway — fallback strong model
  gemini: "google/gemini-3-flash-preview",
  mistral: "google/gemini-3.1-flash-lite-preview",
  custom: "google/gemini-3-flash-preview",
};

const MODE_PROMPTS: Record<string, string> = {
  chat: "You are Aivora, a premium AI assistant. Be helpful, concise, warm, and intelligent. Use markdown.",
  research: "You are Aivora in Research mode. Provide thorough, well-structured answers with citations-style reasoning, bullet points, and key facts. Use markdown.",
  coding: "You are Aivora in Coding mode. Provide production-quality code with clear explanations, in fenced code blocks with language tags.",
  image: "You are Aivora in Image mode. Describe rich, vivid visual concepts and offer detailed prompts the user could feed to image generators.",
  agent: "You are Aivora in Agent mode. Plan tasks step-by-step, list actions, and reason about execution.",
  automation: "You are Aivora in Automation mode. Design workflows as ordered steps with inputs, triggers, and outputs.",
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = auth.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const body = (await request.json()) as Body;
        const messages = body.messages ?? [];
        const threadId = body.threadId;
        if (!threadId) return new Response("threadId required", { status: 400 });

        // verify thread ownership
        const { data: thread } = await userClient
          .from("chat_threads")
          .select("id,title")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        const modelId = MODEL_MAP[body.model ?? "gemini"] ?? MODEL_MAP.gemini;
        const system = MODE_PROMPTS[body.mode ?? "chat"] ?? MODE_PROMPTS.chat;

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(modelId);

        const lastUser = [...messages].reverse().find((m) => m.role === "user");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              // Persist the newest user message and assistant reply.
              const assistant = finalMessages[finalMessages.length - 1];
              const inserts: Array<{
                thread_id: string;
                user_id: string;
                role: string;
                content: Record<string, unknown>;
              }> = [];
              if (lastUser) {
                inserts.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "user",
                  content: { parts: lastUser.parts as unknown as Record<string, unknown>[] },
                });
              }
              if (assistant && assistant.role === "assistant") {
                inserts.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  content: { parts: assistant.parts as unknown as Record<string, unknown>[] },
                });
              }
              if (inserts.length) {
                const { error } = await supabaseAdmin
                  .from("chat_messages")
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .insert(inserts as any);
                if (error) console.error("[chat] persist messages error", error);
              }
              // Auto-title from first user message if title is default
              if (thread.title === "New chat" && lastUser) {
                const text = lastUser.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join(" ")
                  .trim()
                  .slice(0, 80);
                if (text) {
                  await supabaseAdmin
                    .from("chat_threads")
                    .update({ title: text, updated_at: new Date().toISOString() })
                    .eq("id", threadId);
                }
              } else {
                await supabaseAdmin
                  .from("chat_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              }
            } catch (e) {
              console.error("[chat] onFinish error", e);
            }
          },
        });
      },
    },
  },
});