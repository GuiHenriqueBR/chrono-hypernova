import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL ou Key nao configurados. Algumas funcionalidades podem nao funcionar."
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

// Tipos para realtime
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

// Tipo para payload do Supabase realtime
interface RealtimePayload<T> {
  eventType: string;
  new: T;
  old: T | null;
}

// Tipo para configuracao do channel
interface PostgresChangesConfig {
  event: RealtimeEvent | undefined;
  schema: string;
  table: string;
  filter?: string;
}

/**
 * Subscrever a mudancas em uma tabela
 */
export function subscribeToTable<T extends Record<string, unknown>>(
  table: string,
  callback: (payload: {
    eventType: RealtimeEvent;
    new: T;
    old: T | null;
  }) => void,
  event: RealtimeEvent = "*",
  filter?: string
): RealtimeSubscription {
  const config: PostgresChangesConfig = {
    event: event === "*" ? undefined : event,
    schema: "public",
    table,
    filter,
  };

  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      // @ts-expect-error - Supabase types don't fully support postgres_changes
      "postgres_changes",
      config,
      (payload: RealtimePayload<T>) => {
        callback({
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new as T,
          old: payload.old as T | null,
        });
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscrever a multiplas tabelas
 */
export function subscribeToMultipleTables(
  subscriptions: Array<{
    table: string;
    event?: RealtimeEvent;
    filter?: string;
    callback: (payload: {
      eventType: RealtimeEvent;
      new: Record<string, unknown>;
      old: Record<string, unknown> | null;
    }) => void;
  }>
): RealtimeSubscription {
  let channel: RealtimeChannel = supabase.channel("multi-table-changes");

  subscriptions.forEach(({ table, event = "*", filter, callback }) => {
    const config: PostgresChangesConfig = {
      event: event === "*" ? undefined : event,
      schema: "public",
      table,
      filter,
    };

    channel = channel.on(
      // @ts-expect-error - Supabase types don't fully support postgres_changes
      "postgres_changes",
      config,
      (payload: RealtimePayload<Record<string, unknown>>) => {
        callback({
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown> | null,
        });
      }
    );
  });

  channel.subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
