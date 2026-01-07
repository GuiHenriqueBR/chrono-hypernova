"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarScheduler = iniciarScheduler;
exports.pararScheduler = pararScheduler;
exports.executarVerificacaoManual = executarVerificacaoManual;
exports.statusScheduler = statusScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../utils/logger");
const alertas_1 = require("../services/alertas");
const supabase_1 = require("../services/supabase");
// Armazenar referencias dos jobs para poder cancelar
const jobs = [];
// ==========================================
// JOBS AGENDADOS
// ==========================================
// Job de alertas - 4 vezes ao dia (08:00, 10:00, 14:00, 17:00)
function iniciarJobAlertas() {
    // 08:00 - Resumo da manha
    const job1 = node_cron_1.default.schedule('0 8 * * *', async () => {
        logger_1.logger.info('[CRON] Executando verificacao de alertas - 08:00');
        try {
            const resultado = await (0, alertas_1.executarVerificacoesAlertas)();
            logger_1.logger.info('[CRON] Alertas 08:00 concluido:', resultado);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de alertas 08:00:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job1);
    // 10:00 - Verificacao meio da manha
    const job2 = node_cron_1.default.schedule('0 10 * * *', async () => {
        logger_1.logger.info('[CRON] Executando verificacao de alertas - 10:00');
        try {
            const resultado = await (0, alertas_1.executarVerificacoesAlertas)();
            logger_1.logger.info('[CRON] Alertas 10:00 concluido:', resultado);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de alertas 10:00:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job2);
    // 14:00 - Verificacao pos-almoco
    const job3 = node_cron_1.default.schedule('0 14 * * *', async () => {
        logger_1.logger.info('[CRON] Executando verificacao de alertas - 14:00');
        try {
            const resultado = await (0, alertas_1.executarVerificacoesAlertas)();
            logger_1.logger.info('[CRON] Alertas 14:00 concluido:', resultado);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de alertas 14:00:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job3);
    // 17:00 - Verificacao fim do dia
    const job4 = node_cron_1.default.schedule('0 17 * * *', async () => {
        logger_1.logger.info('[CRON] Executando verificacao de alertas - 17:00');
        try {
            const resultado = await (0, alertas_1.executarVerificacoesAlertas)();
            logger_1.logger.info('[CRON] Alertas 17:00 concluido:', resultado);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de alertas 17:00:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job4);
    logger_1.logger.info('[CRON] Jobs de alertas agendados para 08:00, 10:00, 14:00 e 17:00');
}
// Job de limpeza - uma vez por semana (domingo as 03:00)
function iniciarJobLimpeza() {
    const job = node_cron_1.default.schedule('0 3 * * 0', async () => {
        logger_1.logger.info('[CRON] Executando limpeza de alertas antigos');
        try {
            const removidos = await (0, alertas_1.limparAlertasAntigos)();
            logger_1.logger.info(`[CRON] Limpeza concluida: ${removidos} alertas removidos`);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de limpeza:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job);
    logger_1.logger.info('[CRON] Job de limpeza agendado para domingos as 03:00');
}
// Job de relatorios semanais - domingo as 18:00
function iniciarJobRelatorioSemanal() {
    const job = node_cron_1.default.schedule('0 18 * * 0', async () => {
        logger_1.logger.info('[CRON] Gerando relatorio semanal');
        try {
            // Buscar todos os usuarios ativos
            const { data: usuarios } = await supabase_1.supabase
                .from('usuarios')
                .select('id, email, nome')
                .eq('ativo', true);
            if (usuarios) {
                for (const usuario of usuarios) {
                    // Gerar resumo para cada usuario
                    const resumo = await (0, alertas_1.gerarResumoDiario)(usuario.id);
                    // Salvar registro do relatorio
                    await supabase_1.supabase.from('relatorios_enviados').insert({
                        usuario_id: usuario.id,
                        tipo: 'semanal',
                        dados: resumo,
                        enviado_em: new Date().toISOString()
                    });
                    logger_1.logger.info(`[CRON] Relatorio semanal gerado para ${usuario.email}:`, {
                        urgentes: resumo.urgentes,
                        alta: resumo.alta_prioridade,
                        total: resumo.total_nao_lidos
                    });
                }
            }
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de relatorio semanal:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job);
    logger_1.logger.info('[CRON] Job de relatorio semanal agendado para domingos as 18:00');
}
// Job de relatorio mensal de comissoes - dia 1 as 08:00
function iniciarJobRelatorioMensal() {
    const job = node_cron_1.default.schedule('0 8 1 * *', async () => {
        logger_1.logger.info('[CRON] Gerando relatorio mensal de comissoes');
        try {
            // Mes anterior
            const hoje = new Date();
            const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            // Buscar comissoes do mes anterior
            const { data: comissoes } = await supabase_1.supabase
                .from('comissoes')
                .select('*, apolices(numero_apolice, seguradora)')
                .gte('data_pagamento', mesAnterior.toISOString().split('T')[0])
                .lte('data_pagamento', fimMesAnterior.toISOString().split('T')[0])
                .eq('status', 'paga');
            const totalComissoes = comissoes?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;
            // Buscar usuarios para notificar
            const { data: usuarios } = await supabase_1.supabase
                .from('usuarios')
                .select('id, email, nome')
                .eq('ativo', true);
            if (usuarios) {
                for (const usuario of usuarios) {
                    await supabase_1.supabase.from('alertas').insert({
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
            logger_1.logger.info(`[CRON] Relatorio mensal concluido. Total: R$ ${totalComissoes.toFixed(2)}`);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro no job de relatorio mensal:', err);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
    jobs.push(job);
    logger_1.logger.info('[CRON] Job de relatorio mensal agendado para dia 1 as 08:00');
}
// ==========================================
// INICIALIZAR TODOS OS JOBS
// ==========================================
function iniciarScheduler() {
    logger_1.logger.info('[CRON] Iniciando scheduler de jobs...');
    iniciarJobAlertas();
    iniciarJobLimpeza();
    iniciarJobRelatorioSemanal();
    iniciarJobRelatorioMensal();
    logger_1.logger.info(`[CRON] ${jobs.length} jobs inicializados com sucesso`);
    // Executar verificacao inicial apos 10 segundos
    setTimeout(async () => {
        logger_1.logger.info('[CRON] Executando verificacao inicial de alertas...');
        try {
            const resultado = await (0, alertas_1.executarVerificacoesAlertas)();
            logger_1.logger.info('[CRON] Verificacao inicial concluida:', resultado);
        }
        catch (err) {
            logger_1.logger.error('[CRON] Erro na verificacao inicial:', err);
        }
    }, 10000);
}
// Parar todos os jobs
function pararScheduler() {
    logger_1.logger.info('[CRON] Parando scheduler...');
    jobs.forEach(job => job.stop());
    logger_1.logger.info(`[CRON] ${jobs.length} jobs parados`);
}
// Executar verificacao manual
async function executarVerificacaoManual() {
    logger_1.logger.info('[CRON] Executando verificacao manual...');
    return await (0, alertas_1.executarVerificacoesAlertas)();
}
// Status dos jobs
function statusScheduler() {
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
