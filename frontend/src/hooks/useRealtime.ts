import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTable, subscribeToMultipleTables, RealtimeEvent, RealtimeSubscription } from '../services/supabase';
import { useNotifications } from './useNotifications';

// Hook para subscrever a uma tabela especifica
export function useRealtimeTable<T extends Record<string, unknown>>(
  table: string,
  queryKey: string[],
  options?: {
    event?: RealtimeEvent;
    filter?: string;
    enabled?: boolean;
    onInsert?: (data: T) => void;
    onUpdate?: (data: T) => void;
    onDelete?: (data: T) => void;
  }
) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  const handleChange = useCallback(
    (payload: { eventType: RealtimeEvent; new: T; old: T | null }) => {
      // Invalidar query para refetch
      queryClient.invalidateQueries({ queryKey });

      // Callbacks especificos
      switch (payload.eventType) {
        case 'INSERT':
          options?.onInsert?.(payload.new);
          break;
        case 'UPDATE':
          options?.onUpdate?.(payload.new);
          break;
        case 'DELETE':
          options?.onDelete?.(payload.old as T);
          break;
      }
    },
    [queryClient, queryKey, options]
  );

  useEffect(() => {
    if (options?.enabled === false) return;

    subscriptionRef.current = subscribeToTable<T>(
      table,
      handleChange,
      options?.event,
      options?.filter
    );

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [table, handleChange, options?.enabled, options?.event, options?.filter]);
}

// Hook para notificacoes em tempo real do sistema
export function useRealtimeNotifications() {
  const { addNotification } = useNotifications();
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  useEffect(() => {
    subscriptionRef.current = subscribeToMultipleTables([
      // Novos sinistros
      {
        table: 'sinistros',
        event: 'INSERT',
        callback: (payload) => {
          addNotification({
            type: 'info',
            title: 'Novo Sinistro',
            message: `Sinistro ${payload.new.numero_sinistro || 'novo'} foi aberto`,
            link: `/sinistros/${payload.new.id}`,
          });
        },
      },
      // Atualizacao de status de sinistro
      {
        table: 'sinistros',
        event: 'UPDATE',
        callback: (payload) => {
          if (payload.old?.status !== payload.new.status) {
            addNotification({
              type: 'info',
              title: 'Sinistro Atualizado',
              message: `Sinistro ${payload.new.numero_sinistro || ''} mudou para ${payload.new.status}`,
              link: `/sinistros/${payload.new.id}`,
            });
          }
        },
      },
      // Novas mensagens WhatsApp
      {
        table: 'whatsapp_mensagens',
        event: 'INSERT',
        callback: (payload) => {
          if (payload.new.remetente === 'cliente') {
            addNotification({
              type: 'message',
              title: 'Nova Mensagem WhatsApp',
              message: String(payload.new.conteudo || '').slice(0, 50) + '...',
              link: `/whatsapp`,
            });
          }
        },
      },
      // Apolices prestes a vencer (via tarefa)
      {
        table: 'tarefas',
        event: 'INSERT',
        callback: (payload) => {
          if (payload.new.tipo === 'renovacao' || payload.new.tipo === 'vencimento') {
            addNotification({
              type: 'warning',
              title: 'Lembrete de Renovacao',
              message: String(payload.new.descricao || 'Nova tarefa de renovacao'),
              link: `/agenda`,
            });
          }
        },
      },
      // Novos documentos de sinistro
      {
        table: 'sinistro_documentos',
        event: 'INSERT',
        callback: (payload) => {
          addNotification({
            type: 'info',
            title: 'Documento Adicionado',
            message: `Novo documento: ${payload.new.nome_arquivo || 'arquivo'}`,
            link: `/sinistros/${payload.new.sinistro_id}`,
          });
        },
      },
    ]);

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [addNotification]);
}

// Hook para chat WhatsApp em tempo real
export function useRealtimeWhatsApp(conversaId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversaId) return;

    const subscription = subscribeToTable(
      'whatsapp_mensagens',
      () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', conversaId] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      },
      '*',
      `conversa_id=eq.${conversaId}`
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [conversaId, queryClient]);
}

// Hook para timeline de sinistro em tempo real
export function useRealtimeSinistro(sinistroId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sinistroId) return;

    const subscription = subscribeToMultipleTables([
      {
        table: 'regulacao_sinistro',
        filter: `sinistro_id=eq.${sinistroId}`,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: ['sinistro', sinistroId] });
          queryClient.invalidateQueries({ queryKey: ['sinistro-regulacao', sinistroId] });
        },
      },
      {
        table: 'sinistro_documentos',
        filter: `sinistro_id=eq.${sinistroId}`,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: ['sinistro', sinistroId] });
          queryClient.invalidateQueries({ queryKey: ['sinistro-documentos', sinistroId] });
        },
      },
    ]);

    return () => {
      subscription.unsubscribe();
    };
  }, [sinistroId, queryClient]);
}
