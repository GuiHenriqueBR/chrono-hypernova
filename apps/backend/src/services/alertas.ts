import { supabase } from './supabase';
import { logger } from '../utils/logger';

// Tipos de alertas
export type TipoAlerta = 
  | 'renovacao_apolice'
  | 'vencimento_parcela'
  | 'sinistro_pendente'
  | 'tarefa_atrasada'
  | 'comissao_pendente'
  | 'aniversario_cliente'
  | 'consorcio_parcela'
  | 'plano_saude_reajuste'
  | 'financiamento_parcela'
  | 'documento_pendente';

export type PrioridadeAlerta = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Alerta {
  id?: string;
  usuario_id: string;
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  prioridade: PrioridadeAlerta;
  entidade_tipo?: string;
  entidade_id?: string;
  data_referencia?: string;
  lido: boolean;
  enviado_email: boolean;
  enviado_whatsapp: boolean;
  created_at?: string;
}

export interface ResumoAlertas {
  urgentes: number;
  alta_prioridade: number;
  media_prioridade: number;
  baixa_prioridade: number;
  total_nao_lidos: number;
  alertas: Alerta[];
}

// Criar um novo alerta
export async function criarAlerta(alerta: Omit<Alerta, 'id' | 'created_at'>): Promise<Alerta | null> {
  try {
    const { data, error } = await supabase
      .from('alertas')
      .insert(alerta)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar alerta:', error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Erro ao criar alerta:', err);
    return null;
  }
}

// Buscar alertas do usuario
export async function buscarAlertas(
  usuarioId: string, 
  options: { 
    apenasNaoLidos?: boolean; 
    tipo?: TipoAlerta;
    limite?: number;
  } = {}
): Promise<Alerta[]> {
  try {
    let query = supabase
      .from('alertas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });

    if (options.apenasNaoLidos) {
      query = query.eq('lido', false);
    }

    if (options.tipo) {
      query = query.eq('tipo', options.tipo);
    }

    if (options.limite) {
      query = query.limit(options.limite);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Erro ao buscar alertas:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Erro ao buscar alertas:', err);
    return [];
  }
}

// Marcar alerta como lido
export async function marcarComoLido(alertaId: string, usuarioId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('id', alertaId)
      .eq('usuario_id', usuarioId);

    if (error) {
      logger.error('Erro ao marcar alerta como lido:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Erro ao marcar alerta como lido:', err);
    return false;
  }
}

// Marcar todos como lidos
export async function marcarTodosComoLidos(usuarioId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('alertas')
      .update({ lido: true })
      .eq('usuario_id', usuarioId)
      .eq('lido', false);

    if (error) {
      logger.error('Erro ao marcar alertas como lidos:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Erro ao marcar alertas como lidos:', err);
    return false;
  }
}

// ==========================================
// GERADORES DE ALERTAS AUTOMATICOS
// ==========================================

// Verificar apolices proximas do vencimento
export async function verificarRenovacoesApolices(diasAntecedencia: number = 30): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

    const { data: apolices, error } = await supabase
      .from('apolices')
      .select('*, clientes(nome, usuario_id)')
      .eq('status', 'vigente')
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .gte('data_vencimento', new Date().toISOString().split('T')[0]);

    if (error || !apolices) {
      logger.error('Erro ao buscar apolices para renovacao:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const apolice of apolices) {
      const usuarioId = apolice.clientes?.usuario_id;
      if (!usuarioId) continue;

      // Verificar se ja existe alerta para esta apolice
      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'renovacao_apolice')
        .eq('entidade_id', apolice.id)
        .eq('usuario_id', usuarioId)
        .single();

      if (!alertaExistente) {
        const diasParaVencer = Math.ceil(
          (new Date(apolice.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        const prioridade: PrioridadeAlerta = 
          diasParaVencer <= 7 ? 'urgente' : 
          diasParaVencer <= 15 ? 'alta' : 'media';

        await criarAlerta({
          usuario_id: usuarioId,
          tipo: 'renovacao_apolice',
          titulo: `Renovacao: ${apolice.numero_apolice}`,
          mensagem: `A apolice ${apolice.numero_apolice} do cliente ${apolice.clientes?.nome || 'N/A'} vence em ${diasParaVencer} dias (${apolice.data_vencimento}). Seguradora: ${apolice.seguradora}`,
          prioridade,
          entidade_tipo: 'apolice',
          entidade_id: apolice.id,
          data_referencia: apolice.data_vencimento,
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de renovacao criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar renovacoes:', err);
    return 0;
  }
}

// Verificar tarefas atrasadas
export async function verificarTarefasAtrasadas(): Promise<number> {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const { data: tarefas, error } = await supabase
      .from('tarefas')
      .select('*, clientes(nome)')
      .eq('concluida', false)
      .lt('data_vencimento', hoje);

    if (error || !tarefas) {
      logger.error('Erro ao buscar tarefas atrasadas:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const tarefa of tarefas) {
      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'tarefa_atrasada')
        .eq('entidade_id', tarefa.id)
        .single();

      if (!alertaExistente) {
        const diasAtraso = Math.ceil(
          (new Date().getTime() - new Date(tarefa.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
        );

        await criarAlerta({
          usuario_id: tarefa.usuario_id,
          tipo: 'tarefa_atrasada',
          titulo: `Tarefa Atrasada: ${tarefa.descricao?.substring(0, 50) || 'Sem descricao'}`,
          mensagem: `A tarefa "${tarefa.descricao}" esta atrasada ha ${diasAtraso} dias. Prioridade original: ${tarefa.prioridade}`,
          prioridade: diasAtraso > 7 ? 'urgente' : 'alta',
          entidade_tipo: 'tarefa',
          entidade_id: tarefa.id,
          data_referencia: tarefa.data_vencimento,
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de tarefas atrasadas criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar tarefas atrasadas:', err);
    return 0;
  }
}

// Verificar sinistros pendentes ha muito tempo
export async function verificarSinistrosPendentes(diasLimite: number = 30): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const { data: sinistros, error } = await supabase
      .from('sinistros')
      .select('*, clientes(nome, usuario_id), apolices(numero_apolice)')
      .not('status', 'in', '(pago,recusado)')
      .lte('created_at', dataLimite.toISOString());

    if (error || !sinistros) {
      logger.error('Erro ao buscar sinistros pendentes:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const sinistro of sinistros) {
      // Buscar usuario responsavel via cliente
      const usuarioId = sinistro.clientes?.usuario_id;

      if (!usuarioId) continue;

      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'sinistro_pendente')
        .eq('entidade_id', sinistro.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!alertaExistente) {
        const diasAberto = Math.ceil(
          (new Date().getTime() - new Date(sinistro.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        await criarAlerta({
          usuario_id: usuarioId,
          tipo: 'sinistro_pendente',
          titulo: `Sinistro Pendente: ${sinistro.numero_sinistro}`,
          mensagem: `O sinistro ${sinistro.numero_sinistro} esta em "${sinistro.status}" ha ${diasAberto} dias. Cliente: ${sinistro.clientes?.nome || 'N/A'}`,
          prioridade: diasAberto > 60 ? 'urgente' : diasAberto > 30 ? 'alta' : 'media',
          entidade_tipo: 'sinistro',
          entidade_id: sinistro.id,
          data_referencia: sinistro.created_at,
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de sinistros pendentes criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar sinistros pendentes:', err);
    return 0;
  }
}

// Verificar comissoes pendentes
export async function verificarComissoesPendentes(): Promise<number> {
  try {
    const { data: comissoes, error } = await supabase
      .from('comissoes')
      .select('*, apolices(numero_apolice, seguradora, clientes(nome, usuario_id))')
      .eq('status', 'pendente')
      .order('data_receita', { ascending: true });

    if (error || !comissoes) {
      logger.error('Erro ao buscar comissoes pendentes:', error);
      return 0;
    }

    // Agrupar por usuario
    const comissoesPorUsuario: Record<string, any[]> = {};
    
    for (const comissao of comissoes) {
      const usuarioId = comissao.apolices?.clientes?.usuario_id;

      if (usuarioId) {
        if (!comissoesPorUsuario[usuarioId]) {
          comissoesPorUsuario[usuarioId] = [];
        }
        comissoesPorUsuario[usuarioId].push(comissao);
      }
    }

    let alertasCriados = 0;

    for (const [usuarioId, comissoesUsuario] of Object.entries(comissoesPorUsuario)) {
      const valorTotal = comissoesUsuario.reduce((acc, c) => acc + (c.valor_liquido || 0), 0);
      
      // Criar alerta consolidado por usuario (maximo 1 por dia)
      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'comissao_pendente')
        .eq('usuario_id', usuarioId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!alertaExistente && comissoesUsuario.length > 0) {
        await criarAlerta({
          usuario_id: usuarioId,
          tipo: 'comissao_pendente',
          titulo: `${comissoesUsuario.length} Comissoes Pendentes`,
          mensagem: `Voce tem ${comissoesUsuario.length} comissoes pendentes totalizando R$ ${valorTotal.toFixed(2)}`,
          prioridade: valorTotal > 5000 ? 'alta' : 'media',
          entidade_tipo: 'comissao',
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de comissoes pendentes criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar comissoes pendentes:', err);
    return 0;
  }
}

// Verificar parcelas de consorcio vencendo
export async function verificarParcelasConsorcio(): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 7);
    const hoje = new Date().toISOString().split('T')[0];

    const { data: parcelas, error } = await supabase
      .from('consorcio_parcelas')
      .select('*, consorcios(*, clientes(nome))')
      .eq('status', 'pendente')
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .gte('data_vencimento', hoje);

    if (error || !parcelas) {
      logger.error('Erro ao buscar parcelas de consorcio:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const parcela of parcelas) {
      if (!parcela.consorcios?.usuario_id) continue;

      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'consorcio_parcela')
        .eq('entidade_id', parcela.id)
        .single();

      if (!alertaExistente) {
        const diasParaVencer = Math.ceil(
          (new Date(parcela.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await criarAlerta({
          usuario_id: parcela.consorcios.usuario_id,
          tipo: 'consorcio_parcela',
          titulo: `Parcela Consorcio: ${parcela.consorcios.numero_contrato}`,
          mensagem: `Parcela ${parcela.numero_parcela} do consorcio ${parcela.consorcios.numero_contrato} vence em ${diasParaVencer} dias. Valor: R$ ${parcela.valor_parcela?.toFixed(2) || '0.00'}`,
          prioridade: diasParaVencer <= 3 ? 'urgente' : 'alta',
          entidade_tipo: 'consorcio_parcela',
          entidade_id: parcela.id,
          data_referencia: parcela.data_vencimento,
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de parcelas de consorcio criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar parcelas de consorcio:', err);
    return 0;
  }
}

// Verificar parcelas de financiamento vencendo
export async function verificarParcelasFinanciamento(): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 7);
    const hoje = new Date().toISOString().split('T')[0];

    const { data: parcelas, error } = await supabase
      .from('financiamento_parcelas')
      .select('*, financiamentos(*, clientes(nome))')
      .eq('status', 'pendente')
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .gte('data_vencimento', hoje);

    if (error || !parcelas) {
      logger.error('Erro ao buscar parcelas de financiamento:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const parcela of parcelas) {
      if (!parcela.financiamentos?.usuario_id) continue;

      const { data: alertaExistente } = await supabase
        .from('alertas')
        .select('id')
        .eq('tipo', 'financiamento_parcela')
        .eq('entidade_id', parcela.id)
        .single();

      if (!alertaExistente) {
        const diasParaVencer = Math.ceil(
          (new Date(parcela.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await criarAlerta({
          usuario_id: parcela.financiamentos.usuario_id,
          tipo: 'financiamento_parcela',
          titulo: `Parcela Financiamento: ${parcela.financiamentos.numero_contrato}`,
          mensagem: `Parcela ${parcela.numero_parcela} do financiamento ${parcela.financiamentos.numero_contrato} vence em ${diasParaVencer} dias. Valor: R$ ${parcela.valor_parcela?.toFixed(2) || '0.00'}`,
          prioridade: diasParaVencer <= 3 ? 'urgente' : 'alta',
          entidade_tipo: 'financiamento_parcela',
          entidade_id: parcela.id,
          data_referencia: parcela.data_vencimento,
          lido: false,
          enviado_email: false,
          enviado_whatsapp: false
        });

        alertasCriados++;
      }
    }

    logger.info(`Alertas de parcelas de financiamento criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar parcelas de financiamento:', err);
    return 0;
  }
}

// Verificar aniversarios de clientes (proximos 7 dias)
export async function verificarAniversariosClientes(): Promise<number> {
  try {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1;

    // Buscar clientes com data de nascimento
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .not('data_nascimento', 'is', null);

    if (error || !clientes) {
      logger.error('Erro ao buscar clientes para aniversario:', error);
      return 0;
    }

    let alertasCriados = 0;

    for (const cliente of clientes) {
      if (!cliente.data_nascimento || !cliente.usuario_id) continue;

      const dataNasc = new Date(cliente.data_nascimento);
      const diaNasc = dataNasc.getDate();
      const mesNasc = dataNasc.getMonth() + 1;

      // Verificar se o aniversario e nos proximos 7 dias
      let diasParaAniversario = -1;
      for (let i = 0; i <= 7; i++) {
        const dataVerificar = new Date(hoje);
        dataVerificar.setDate(hoje.getDate() + i);
        if (dataVerificar.getDate() === diaNasc && dataVerificar.getMonth() + 1 === mesNasc) {
          diasParaAniversario = i;
          break;
        }
      }

      if (diasParaAniversario >= 0) {
        const { data: alertaExistente } = await supabase
          .from('alertas')
          .select('id')
          .eq('tipo', 'aniversario_cliente')
          .eq('entidade_id', cliente.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!alertaExistente) {
          const mensagem = diasParaAniversario === 0 
            ? `Hoje e aniversario do cliente ${cliente.nome}! Aproveite para enviar uma mensagem de parabens.`
            : `O cliente ${cliente.nome} faz aniversario em ${diasParaAniversario} dias (${diaNasc}/${mesNasc}).`;

          await criarAlerta({
            usuario_id: cliente.usuario_id,
            tipo: 'aniversario_cliente',
            titulo: diasParaAniversario === 0 ? `Aniversario Hoje: ${cliente.nome}` : `Aniversario em ${diasParaAniversario} dias`,
            mensagem,
            prioridade: diasParaAniversario === 0 ? 'alta' : 'baixa',
            entidade_tipo: 'cliente',
            entidade_id: cliente.id,
            data_referencia: `${hoje.getFullYear()}-${String(mesNasc).padStart(2, '0')}-${String(diaNasc).padStart(2, '0')}`,
            lido: false,
            enviado_email: false,
            enviado_whatsapp: false
          });

          alertasCriados++;
        }
      }
    }

    logger.info(`Alertas de aniversario criados: ${alertasCriados}`);
    return alertasCriados;
  } catch (err) {
    logger.error('Erro ao verificar aniversarios:', err);
    return 0;
  }
}

// ==========================================
// GERAR RESUMO DIARIO
// ==========================================

export async function gerarResumoDiario(usuarioId: string): Promise<ResumoAlertas> {
  try {
    const alertas = await buscarAlertas(usuarioId, { apenasNaoLidos: true, limite: 100 });

    const resumo: ResumoAlertas = {
      urgentes: alertas.filter(a => a.prioridade === 'urgente').length,
      alta_prioridade: alertas.filter(a => a.prioridade === 'alta').length,
      media_prioridade: alertas.filter(a => a.prioridade === 'media').length,
      baixa_prioridade: alertas.filter(a => a.prioridade === 'baixa').length,
      total_nao_lidos: alertas.length,
      alertas: alertas.slice(0, 20) // Top 20 alertas
    };

    return resumo;
  } catch (err) {
    logger.error('Erro ao gerar resumo diario:', err);
    return {
      urgentes: 0,
      alta_prioridade: 0,
      media_prioridade: 0,
      baixa_prioridade: 0,
      total_nao_lidos: 0,
      alertas: []
    };
  }
}

// ==========================================
// EXECUTAR TODAS AS VERIFICACOES
// ==========================================

export async function executarVerificacoesAlertas(): Promise<{
  renovacoes: number;
  tarefas: number;
  sinistros: number;
  comissoes: number;
  consorcios: number;
  financiamentos: number;
  aniversarios: number;
  total: number;
}> {
  logger.info('Iniciando verificacoes de alertas...');

  const [
    renovacoes,
    tarefas,
    sinistros,
    comissoes,
    consorcios,
    financiamentos,
    aniversarios
  ] = await Promise.all([
    verificarRenovacoesApolices(),
    verificarTarefasAtrasadas(),
    verificarSinistrosPendentes(),
    verificarComissoesPendentes(),
    verificarParcelasConsorcio(),
    verificarParcelasFinanciamento(),
    verificarAniversariosClientes()
  ]);

  const resultado = {
    renovacoes,
    tarefas,
    sinistros,
    comissoes,
    consorcios,
    financiamentos,
    aniversarios,
    total: renovacoes + tarefas + sinistros + comissoes + consorcios + financiamentos + aniversarios
  };

  logger.info('Verificacoes de alertas concluidas:', resultado);

  return resultado;
}

// Limpar alertas antigos (mais de 90 dias)
export async function limparAlertasAntigos(): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 90);

    const { data, error } = await supabase
      .from('alertas')
      .delete()
      .eq('lido', true)
      .lt('created_at', dataLimite.toISOString())
      .select();

    if (error) {
      logger.error('Erro ao limpar alertas antigos:', error);
      return 0;
    }

    logger.info(`Alertas antigos removidos: ${data?.length || 0}`);
    return data?.length || 0;
  } catch (err) {
    logger.error('Erro ao limpar alertas antigos:', err);
    return 0;
  }
}
