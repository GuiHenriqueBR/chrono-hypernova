import cron from 'node-cron';
import { logger } from '../utils/logger';
import {
  executarVerificacoesAlertas,
  limparAlertasAntigos,
  gerarResumoDiario
} from '../services/alertas';
import { supabase } from '../services/supabase';

// Armazenar referencias dos jobs para poder cancelar
const jobs: cron.ScheduledTask[] = [];

// ==========================================
// JOBS AGENDADOS
// ==========================================

// Job de alertas - 4 vezes ao dia (08:00, 10:00, 14:00, 17:00)
function iniciarJobAlertas() {
  // 08:00 - Resumo da manha
  const job1 = cron.schedule('0 8 * * *', async () => {
    logger.info('[CRON] Executando verificacao de alertas - 08:00');
    try {
      const resultado = await executarVerificacoesAlertas();
      logger.info('[CRON] Alertas 08:00 concluido:', resultado);
    } catch (err) {
      logger.error('[CRON] Erro no job de alertas 08:00:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job1);

  // 10:00 - Verificacao meio da manha
  const job2 = cron.schedule('0 10 * * *', async () => {
    logger.info('[CRON] Executando verificacao de alertas - 10:00');
    try {
      const resultado = await executarVerificacoesAlertas();
      logger.info('[CRON] Alertas 10:00 concluido:', resultado);
    } catch (err) {
      logger.error('[CRON] Erro no job de alertas 10:00:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job2);

  // 14:00 - Verificacao pos-almoco
  const job3 = cron.schedule('0 14 * * *', async () => {
    logger.info('[CRON] Executando verificacao de alertas - 14:00');
    try {
      const resultado = await executarVerificacoesAlertas();
      logger.info('[CRON] Alertas 14:00 concluido:', resultado);
    } catch (err) {
      logger.error('[CRON] Erro no job de alertas 14:00:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job3);

  // 17:00 - Verificacao fim do dia
  const job4 = cron.schedule('0 17 * * *', async () => {
    logger.info('[CRON] Executando verificacao de alertas - 17:00');
    try {
      const resultado = await executarVerificacoesAlertas();
      logger.info('[CRON] Alertas 17:00 concluido:', resultado);
    } catch (err) {
      logger.error('[CRON] Erro no job de alertas 17:00:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job4);

  logger.info('[CRON] Jobs de alertas agendados para 08:00, 10:00, 14:00 e 17:00');
}

// Job de limpeza - uma vez por semana (domingo as 03:00)
function iniciarJobLimpeza() {
  const job = cron.schedule('0 3 * * 0', async () => {
    logger.info('[CRON] Executando limpeza de alertas antigos');
    try {
      const removidos = await limparAlertasAntigos();
      logger.info(`[CRON] Limpeza concluida: ${removidos} alertas removidos`);
    } catch (err) {
      logger.error('[CRON] Erro no job de limpeza:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job);

  logger.info('[CRON] Job de limpeza agendado para domingos as 03:00');
}

// Job de relatorios semanais - domingo as 18:00
function iniciarJobRelatorioSemanal() {
  const job = cron.schedule('0 18 * * 0', async () => {
    logger.info('[CRON] Gerando relatorio semanal');
    try {
      // Buscar todos os usuarios ativos
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, email, nome')
        .eq('ativo', true);

      if (usuarios) {
        for (const usuario of usuarios) {
          // Gerar resumo para cada usuario
          const resumo = await gerarResumoDiario(usuario.id);
          
          // Salvar registro do relatorio
          await supabase.from('relatorios_enviados').insert({
            usuario_id: usuario.id,
            tipo: 'semanal',
            dados: resumo,
            enviado_em: new Date().toISOString()
          });

          logger.info(`[CRON] Relatorio semanal gerado para ${usuario.email}:`, {
            urgentes: resumo.urgentes,
            alta: resumo.alta_prioridade,
            total: resumo.total_nao_lidos
          });
        }
      }
    } catch (err) {
      logger.error('[CRON] Erro no job de relatorio semanal:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job);

  logger.info('[CRON] Job de relatorio semanal agendado para domingos as 18:00');
}

// Job de relatorio mensal de comissoes - dia 1 as 08:00
function iniciarJobRelatorioMensal() {
  const job = cron.schedule('0 8 1 * *', async () => {
    logger.info('[CRON] Gerando relatorio mensal de comissoes');
    try {
      // Mes anterior
      const hoje = new Date();
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      // Buscar comissoes do mes anterior
      const { data: comissoes } = await supabase
        .from('comissoes')
        .select('*, apolices(numero_apolice, seguradora)')
        .gte('data_pagamento', mesAnterior.toISOString().split('T')[0])
        .lte('data_pagamento', fimMesAnterior.toISOString().split('T')[0])
        .eq('status', 'paga');

      const totalComissoes = comissoes?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;

      // Buscar usuarios para notificar
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, email, nome')
        .eq('ativo', true);

      if (usuarios) {
        for (const usuario of usuarios) {
          await supabase.from('alertas').insert({
            usuario_id: usuario.id,
            tipo: 'comissao_pendente',
            titulo: `Relatorio de Comissoes - ${mesAnterior.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            mensagem: `Total de comissoes recebidas no mes: R$ ${totalComissoes.toFixed(2)}. ${comissoes?.length || 0} pagamentos processados.`,
            prioridade: 'media',
            lido: false,
            enviado_email: false,
            enviado_whatsapp: false
          });
        }
      }

      logger.info(`[CRON] Relatorio mensal concluido. Total: R$ ${totalComissoes.toFixed(2)}`);
    } catch (err) {
      logger.error('[CRON] Erro no job de relatorio mensal:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
  jobs.push(job);

  logger.info('[CRON] Job de relatorio mensal agendado para dia 1 as 08:00');
}

// ==========================================
// INICIALIZAR TODOS OS JOBS
// ==========================================

export function iniciarScheduler() {
  logger.info('[CRON] Iniciando scheduler de jobs...');

  iniciarJobAlertas();
  iniciarJobLimpeza();
  iniciarJobRelatorioSemanal();
  iniciarJobRelatorioMensal();

  logger.info(`[CRON] ${jobs.length} jobs inicializados com sucesso`);

  // Executar verificacao inicial apos 10 segundos
  setTimeout(async () => {
    logger.info('[CRON] Executando verificacao inicial de alertas...');
    try {
      const resultado = await executarVerificacoesAlertas();
      logger.info('[CRON] Verificacao inicial concluida:', resultado);
    } catch (err) {
      logger.error('[CRON] Erro na verificacao inicial:', err);
    }
  }, 10000);
}

// Parar todos os jobs
export function pararScheduler() {
  logger.info('[CRON] Parando scheduler...');
  jobs.forEach(job => job.stop());
  logger.info(`[CRON] ${jobs.length} jobs parados`);
}

// Executar verificacao manual
export async function executarVerificacaoManual() {
  logger.info('[CRON] Executando verificacao manual...');
  return await executarVerificacoesAlertas();
}

// Status dos jobs
export function statusScheduler() {
  return {
    totalJobs: jobs.length,
    jobs: [
      { nome: 'Alertas 08:00', horario: '08:00', tipo: 'diario' },
      { nome: 'Alertas 10:00', horario: '10:00', tipo: 'diario' },
      { nome: 'Alertas 14:00', horario: '14:00', tipo: 'diario' },
      { nome: 'Alertas 17:00', horario: '17:00', tipo: 'diario' },
      { nome: 'Limpeza', horario: 'Domingos 03:00', tipo: 'semanal' },
      { nome: 'Relatorio Semanal', horario: 'Domingos 18:00', tipo: 'semanal' },
      { nome: 'Relatorio Mensal', horario: 'Dia 1 08:00', tipo: 'mensal' }
    ],
    timezone: 'America/Sao_Paulo'
  };
}
