import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id,title,pinned,favorite,folder,updated_at,created_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ title: z.string().min(1).max(120).optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: userId, title: data.title ?? "New chat" })
      .select("id,title,pinned,favorite,folder,updated_at,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(160).optional(),
      pinned: z.boolean().optional(),
      favorite: z.boolean().optional(),
      folder: z.string().max(80).nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase
      .from("chat_threads")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("chat_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ threadId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    // verify thread ownership through RLS by selecting
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id,title")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread) throw new Error("Thread not found");
    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const messages: StoredMessage[] = (rows ?? []).map((r) => {
      const c = r.content as { parts?: Array<{ type: string; text?: string }> } | null;
      const text = (c?.parts ?? [])
        .map((p) => (p.type === "text" ? p.text ?? "" : ""))
        .join("");
      return { id: r.id, role: r.role as StoredMessage["role"], text };
    });
    return { thread, messages };
  });