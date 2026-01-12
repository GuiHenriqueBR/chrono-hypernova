import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// Dashboard financeiro (stats)
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    // Comissões recebidas no mês atual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: comissoesMes } = await supabase
      .from("comissoes")
      .select("valor_liquido")
      .gte("data_receita", firstDay.toISOString().split("T")[0])
      .in("status", ["recebida", "paga"]);

    const receitaMes =
      comissoesMes?.reduce((acc, c) => acc + (c.valor_liquido || 0), 0) || 0;

    // Contagem de comissões pendentes
    const { count: comissoesPendentes } = await supabase
      .from("comissoes")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    // Valor total pendente
    const { data: pendentesData } = await supabase
      .from("comissoes")
      .select("valor_liquido")
      .eq("status", "pendente");

    const valorPendente =
      pendentesData?.reduce((acc, c) => acc + (c.valor_liquido || 0), 0) || 0;

    // Total recebido (histórico)
    const { data: comissoesRecebidas } = await supabase
      .from("comissoes")
      .select("valor_liquido")
      .in("status", ["recebida", "paga"]);

    const totalRecebido =
      comissoesRecebidas?.reduce((acc, c) => acc + (c.valor_liquido || 0), 0) ||
      0;

    res.json({
      receitaMes,
      comissoesPendentes: comissoesPendentes || 0,
      valorPendente,
      totalRecebido,
    });
  })
);

// Listar comissões
router.get(
  "/comissoes",
  asyncHandler(async (req: Request, res: Response) => {
    const { apolice_id, status, mes, inicio, fim } = req.query;

    let query = supabase
      .from("comissoes")
      .select("*, apolices(numero_apolice, ramo, seguradora, clientes(nome))")
      .order("data_receita", { ascending: false });

    if (apolice_id) {
      query = query.eq("apolice_id", apolice_id);
    }
    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    if (mes) {
      // Filtrar por mês exato (formato YYYY-MM)
      const [year, month] = (mes as string).split("-");
      const firstDay = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split("T")[0];
      query = query.gte("data_receita", firstDay).lte("data_receita", lastDay);
    } else if (inicio && fim) {
      // Filtrar por periodo personalizado
      query = query
        .gte("data_receita", String(inicio))
        .lte("data_receita", String(fim));
    } else if (inicio) {
      query = query.gte("data_receita", String(inicio));
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data, total: data?.length || 0 });
  })
);

// Buscar comissão por ID
router.get(
  "/comissoes/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("comissoes")
      .select("*, apolices(*, clientes(*))")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }

    res.json(data);
  })
);

// Criar comissão
router.post(
  "/comissoes",
  asyncHandler(async (req: Request, res: Response) => {
    const comissao = req.body;

    const { data, error } = await supabase
      .from("comissoes")
      .insert([comissao])
      .select("*, apolices(numero_apolice, clientes(nome))")
      .single();

    if (error) throw error;

    res.status(201).json(data);
  })
);

// Atualizar comissão
router.put(
  "/comissoes/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from("comissoes")
      .update(updates)
      .eq("id", id)
      .select("*, apolices(numero_apolice, clientes(nome))")
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Comissão não encontrada" });
    }

    res.json(data);
  })
);

// Deletar comissão
router.delete(
  "/comissoes/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabase.from("comissoes").delete().eq("id", id);

    if (error) throw error;

    res.status(204).send();
  })
);

// =====================================================
// ROTAS DE CONFIGURACAO DE COMISSOES
// =====================================================

// Listar configurações de comissão
router.get(
  "/comissao-config",
  asyncHandler(async (req: Request, res: Response) => {
    const { seguradora, ramo, ativo } = req.query;

    let query = supabase
      .from("comissao_configuracoes")
      .select("*")
      .order("seguradora", { ascending: true })
      .order("ramo", { ascending: true });

    if (seguradora) {
      query = query.eq("seguradora", seguradora);
    }
    if (ramo) {
      query = query.eq("ramo", ramo);
    }
    if (ativo !== undefined) {
      query = query.eq("ativo", ativo === "true");
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data, total: data?.length || 0 });
  })
);

// Buscar configuração de comissão por ID
router.get(
  "/comissao-config/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("comissao_configuracoes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Configuração não encontrada" });
    }

    res.json(data);
  })
);

// Criar configuração de comissão
router.post(
  "/comissao-config",
  asyncHandler(async (req: Request, res: Response) => {
    const config = req.body;

    // Validar campos obrigatórios
    if (!config.seguradora || !config.ramo) {
      return res
        .status(400)
        .json({ error: "Seguradora e ramo são obrigatórios" });
    }

    const { data, error } = await supabase
      .from("comissao_configuracoes")
      .insert([config])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ error: "Já existe configuração para esta seguradora/ramo" });
      }
      throw error;
    }

    res.status(201).json(data);
  })
);

// Atualizar configuração de comissão
router.put(
  "/comissao-config/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from("comissao_configuracoes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Configuração não encontrada" });
    }

    res.json(data);
  })
);

// Deletar configuração de comissão
router.delete(
  "/comissao-config/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabase
      .from("comissao_configuracoes")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(204).send();
  })
);

// Listar seguradoras únicas
router.get(
  "/seguradoras",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from("comissao_configuracoes")
      .select("seguradora")
      .order("seguradora", { ascending: true });

    if (error) throw error;

    // Remover duplicatas
    const seguradoras = [...new Set(data?.map((d) => d.seguradora) || [])];

    res.json({ data: seguradoras });
  })
);

// Listar ramos únicos
router.get(
  "/ramos",
  asyncHandler(async (req: Request, res: Response) => {
    const ramos = [
      { value: "auto", label: "Auto" },
      { value: "residencial", label: "Residencial" },
      { value: "vida", label: "Vida" },
      { value: "saude", label: "Saúde" },
      { value: "empresarial", label: "Empresarial" },
      { value: "viagem", label: "Viagem" },
      { value: "rc", label: "Responsabilidade Civil" },
      { value: "todos", label: "Todos (Padrão)" },
    ];

    res.json({ data: ramos });
  })
);

// Calcular comissão para uma apólice específica (manual)
router.post(
  "/calcular-comissao",
  asyncHandler(async (req: Request, res: Response) => {
    const { apolice_id } = req.body;

    if (!apolice_id) {
      return res.status(400).json({ error: "ID da apólice é obrigatório" });
    }

    // Buscar apólice
    const { data: apolice, error: apoliceError } = await supabase
      .from("apolices")
      .select("*")
      .eq("id", apolice_id)
      .single();

    if (apoliceError || !apolice) {
      return res.status(404).json({ error: "Apólice não encontrada" });
    }

    // Verificar se já existe comissão para esta apólice
    const { data: existingComissao } = await supabase
      .from("comissoes")
      .select("id")
      .eq("apolice_id", apolice_id)
      .single();

    if (existingComissao) {
      return res
        .status(400)
        .json({ error: "Já existe comissão para esta apólice" });
    }

    // Buscar configuração de comissão
    let { data: config } = await supabase
      .from("comissao_configuracoes")
      .select("*")
      .eq("seguradora", apolice.seguradora)
      .eq("ramo", apolice.ramo)
      .eq("ativo", true)
      .single();

    // Se não encontrar configuração específica, buscar genérica
    if (!config) {
      const { data: configGenerica } = await supabase
        .from("comissao_configuracoes")
        .select("*")
        .eq("seguradora", apolice.seguradora)
        .eq("ramo", "todos")
        .eq("ativo", true)
        .single();
      config = configGenerica;
    }

    // Se ainda não encontrar, usar configuração padrão
    if (!config) {
      const { data: configPadrao } = await supabase
        .from("comissao_configuracoes")
        .select("*")
        .eq("seguradora", "Outros")
        .eq("ramo", "todos")
        .eq("ativo", true)
        .single();
      config = configPadrao;
    }

    if (!config || config.percentual_comissao === 0) {
      return res
        .status(400)
        .json({
          error: "Não há configuração de comissão para esta seguradora/ramo",
        });
    }

    // Calcular valores
    const valorBruto =
      apolice.valor_premio * (config.percentual_comissao / 100);
    const valorRepasse = (valorBruto * (config.percentual_repasse || 0)) / 100;
    const valorImposto = (valorBruto * (config.percentual_imposto || 0)) / 100;
    const valorLiquido = valorBruto - valorRepasse - valorImposto;

    // Criar comissão
    const { data: comissao, error: comissaoError } = await supabase
      .from("comissoes")
      .insert([
        {
          apolice_id,
          valor_bruto: valorBruto,
          descontos_json: {
            repasse: valorRepasse,
            imposto: valorImposto,
            percentual_comissao: config.percentual_comissao,
            percentual_repasse: config.percentual_repasse,
            percentual_imposto: config.percentual_imposto,
          },
          valor_liquido: valorLiquido,
          data_receita: apolice.data_inicio,
          status: "pendente",
        },
      ])
      .select("*, apolices(numero_apolice, seguradora, ramo, clientes(nome))")
      .single();

    if (comissaoError) throw comissaoError;

    res.status(201).json({
      message: "Comissão calculada e criada com sucesso",
      comissao,
      calculo: {
        premio: apolice.valor_premio,
        percentual_comissao: config.percentual_comissao,
        valor_bruto: valorBruto,
        percentual_repasse: config.percentual_repasse,
        valor_repasse: valorRepasse,
        percentual_imposto: config.percentual_imposto,
        valor_imposto: valorImposto,
        valor_liquido: valorLiquido,
      },
    });
  })
);

// Dados para gráficos do dashboard financeiro
router.get(
  "/charts",
  asyncHandler(async (req: Request, res: Response) => {
    const { periodo } = req.query; // 'mes', 'trimestre', 'ano', 'todos'
    const now = new Date();

    let startDate: Date;
    let monthsBack = 12; // padrão

    switch (periodo) {
      case "mes":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        monthsBack = 1;
        break;
      case "trimestre":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        monthsBack = 3;
        break;
      case "ano":
        startDate = new Date(now.getFullYear(), 0, 1);
        monthsBack = 12;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        monthsBack = 12;
    }

    // 1. Comissões mensais (últimos X meses)
    const { data: comissoesMensais } = await supabase
      .from("comissoes")
      .select("valor_liquido, valor_bruto, data_receita, status")
      .gte("data_receita", startDate.toISOString().split("T")[0])
      .order("data_receita", { ascending: true });

    // Agrupar por mês
    const comissoesPorMes: Record<
      string,
      { recebido: number; pendente: number; bruto: number }
    > = {};

    // Inicializar meses
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (monthsBack - 1 - i),
        1
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      comissoesPorMes[key] = { recebido: 0, pendente: 0, bruto: 0 };
    }

    comissoesMensais?.forEach((c) => {
      if (!c.data_receita) return;
      const date = new Date(c.data_receita);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (comissoesPorMes[key]) {
        comissoesPorMes[key].bruto += c.valor_bruto || 0;
        if (c.status === "recebida" || c.status === "paga") {
          comissoesPorMes[key].recebido += c.valor_liquido || 0;
        } else {
          comissoesPorMes[key].pendente += c.valor_liquido || 0;
        }
      }
    });

    const mesesAbreviados = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const comissoesMensaisChart = Object.entries(comissoesPorMes).map(
      ([key, values]) => ({
        label: mesesAbreviados[parseInt(key.split("-")[1]) - 1],
        mes: key,
        recebido: Math.round(values.recebido * 100) / 100,
        pendente: Math.round(values.pendente * 100) / 100,
        total: Math.round((values.recebido + values.pendente) * 100) / 100,
      })
    );

    // 2. Comissões por seguradora
    const { data: comissoesPorSeguradora } = await supabase
      .from("comissoes")
      .select("valor_liquido, apolices(seguradora)")
      .gte("data_receita", startDate.toISOString().split("T")[0]);

    const seguradorasMap: Record<string, number> = {};
    comissoesPorSeguradora?.forEach((c: any) => {
      const seguradora = c.apolices?.seguradora || "Outros";
      seguradorasMap[seguradora] =
        (seguradorasMap[seguradora] || 0) + (c.valor_liquido || 0);
    });

    const cores = [
      "#8b5cf6",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
    ];
    const comissoesPorSeguradoraChart = Object.entries(seguradorasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([seguradora, valor], index) => ({
        label: seguradora,
        value: Math.round(valor * 100) / 100,
        color: cores[index % cores.length],
      }));

    // 3. Comissões por ramo
    const { data: comissoesPorRamo } = await supabase
      .from("comissoes")
      .select("valor_liquido, apolices(ramo)")
      .gte("data_receita", startDate.toISOString().split("T")[0]);

    const ramosMap: Record<string, number> = {};
    comissoesPorRamo?.forEach((c: any) => {
      const ramo = c.apolices?.ramo || "outros";
      ramosMap[ramo] = (ramosMap[ramo] || 0) + (c.valor_liquido || 0);
    });

    const ramosNomes: Record<string, string> = {
      auto: "Auto",
      residencial: "Residencial",
      vida: "Vida",
      saude: "Saúde",
      empresarial: "Empresarial",
      viagem: "Viagem",
      rc: "RC",
      outros: "Outros",
    };

    const coresRamo = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#6366f1",
    ];
    const comissoesPorRamoChart = Object.entries(ramosMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ramo, valor], index) => ({
        label: ramosNomes[ramo] || ramo,
        value: Math.round(valor * 100) / 100,
        color: coresRamo[index % coresRamo.length],
      }));

    // 4. Totais do período
    const totalRecebido =
      comissoesMensais
        ?.filter((c) => c.status === "recebida" || c.status === "paga")
        .reduce((acc, c) => acc + (c.valor_liquido || 0), 0) || 0;
    const totalPendente =
      comissoesMensais
        ?.filter((c) => c.status === "pendente")
        .reduce((acc, c) => acc + (c.valor_liquido || 0), 0) || 0;
    const totalBruto =
      comissoesMensais?.reduce((acc, c) => acc + (c.valor_bruto || 0), 0) || 0;

    // 5. Comparativo com período anterior
    const periodoAnteriorStart = new Date(startDate);
    periodoAnteriorStart.setMonth(periodoAnteriorStart.getMonth() - monthsBack);
    const periodoAnteriorEnd = new Date(startDate);
    periodoAnteriorEnd.setDate(periodoAnteriorEnd.getDate() - 1);

    const { data: comissoesAnterior } = await supabase
      .from("comissoes")
      .select("valor_liquido")
      .gte("data_receita", periodoAnteriorStart.toISOString().split("T")[0])
      .lte("data_receita", periodoAnteriorEnd.toISOString().split("T")[0])
      .in("status", ["recebida", "paga"]);

    const totalAnterior =
      comissoesAnterior?.reduce((acc, c) => acc + (c.valor_liquido || 0), 0) ||
      0;
    const variacaoPercentual =
      totalAnterior > 0
        ? Math.round(
            ((totalRecebido - totalAnterior) / totalAnterior) * 100 * 100
          ) / 100
        : 0;

    res.json({
      comissoesMensais: comissoesMensaisChart,
      comissoesPorSeguradora: comissoesPorSeguradoraChart,
      comissoesPorRamo: comissoesPorRamoChart,
      totais: {
        recebido: Math.round(totalRecebido * 100) / 100,
        pendente: Math.round(totalPendente * 100) / 100,
        bruto: Math.round(totalBruto * 100) / 100,
        variacaoPercentual,
        periodoAnterior: Math.round(totalAnterior * 100) / 100,
      },
    });
  })
);

// Recalcular comissões de todas as apólices sem comissão
router.post(
  "/recalcular-comissoes",
  asyncHandler(async (req: Request, res: Response) => {
    // Buscar apólices que não têm comissão
    const { data: apolicesSemComissao, error: apolicesError } = await supabase
      .from("apolices")
      .select("id, numero_apolice, seguradora, ramo, valor_premio, data_inicio")
      .not("id", "in", supabase.from("comissoes").select("apolice_id"));

    if (apolicesError) throw apolicesError;

    const resultados = {
      processadas: 0,
      criadas: 0,
      erros: [] as string[],
    };

    for (const apolice of apolicesSemComissao || []) {
      resultados.processadas++;

      // Buscar configuração de comissão
      let { data: config } = await supabase
        .from("comissao_configuracoes")
        .select("*")
        .eq("seguradora", apolice.seguradora)
        .eq("ramo", apolice.ramo)
        .eq("ativo", true)
        .single();

      if (!config) {
        const { data: configGenerica } = await supabase
          .from("comissao_configuracoes")
          .select("*")
          .eq("seguradora", apolice.seguradora)
          .eq("ramo", "todos")
          .eq("ativo", true)
          .single();
        config = configGenerica;
      }

      if (!config) {
        const { data: configPadrao } = await supabase
          .from("comissao_configuracoes")
          .select("*")
          .eq("seguradora", "Outros")
          .eq("ramo", "todos")
          .eq("ativo", true)
          .single();
        config = configPadrao;
      }

      if (!config || config.percentual_comissao === 0) {
        resultados.erros.push(
          `Apólice ${apolice.numero_apolice}: sem configuração de comissão`
        );
        continue;
      }

      // Calcular valores
      const valorBruto =
        apolice.valor_premio * (config.percentual_comissao / 100);
      const valorRepasse =
        (valorBruto * (config.percentual_repasse || 0)) / 100;
      const valorImposto =
        (valorBruto * (config.percentual_imposto || 0)) / 100;
      const valorLiquido = valorBruto - valorRepasse - valorImposto;

      // Criar comissão
      const { error: comissaoError } = await supabase.from("comissoes").insert([
        {
          apolice_id: apolice.id,
          valor_bruto: valorBruto,
          descontos_json: {
            repasse: valorRepasse,
            imposto: valorImposto,
            percentual_comissao: config.percentual_comissao,
            percentual_repasse: config.percentual_repasse,
            percentual_imposto: config.percentual_imposto,
          },
          valor_liquido: valorLiquido,
          data_receita: apolice.data_inicio,
          status: "pendente",
        },
      ]);

      if (comissaoError) {
        resultados.erros.push(
          `Apólice ${apolice.numero_apolice}: ${comissaoError.message}`
        );
      } else {
        resultados.criadas++;
      }
    }

    res.json({
      message: "Recálculo de comissões concluído",
      resultados,
    });
  })
);

// Exportar relatório de comissões (CSV)
router.get(
  "/exportar",
  asyncHandler(async (req: Request, res: Response) => {
    const { periodo, formato } = req.query;

    let startDate: Date;
    const now = new Date();

    switch (periodo) {
      case "mes":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "trimestre":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case "ano":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const { data: comissoes, error } = await supabase
      .from("comissoes")
      .select(
        `
      id,
      valor_bruto,
      valor_liquido,
      data_receita,
      status,
      descontos_json,
      created_at,
      apolices (
        numero_apolice,
        seguradora,
        ramo,
        valor_premio,
        clientes (
          nome,
          cpf_cnpj
        )
      )
    `
      )
      .gte("data_receita", startDate.toISOString().split("T")[0])
      .order("data_receita", { ascending: false });

    if (error) throw error;

    if (formato === "json") {
      return res.json({ data: comissoes });
    }

    // Gerar CSV
    const headers = [
      "Data",
      "Cliente",
      "CPF/CNPJ",
      "Apólice",
      "Seguradora",
      "Ramo",
      "Prêmio",
      "Comissão Bruta",
      "Comissão Líquida",
      "Status",
    ];

    const rows = (comissoes || []).map((c: any) => [
      c.data_receita
        ? new Date(c.data_receita).toLocaleDateString("pt-BR")
        : "",
      c.apolices?.clientes?.nome || "",
      c.apolices?.clientes?.cpf_cnpj || "",
      c.apolices?.numero_apolice || "",
      c.apolices?.seguradora || "",
      c.apolices?.ramo || "",
      c.apolices?.valor_premio?.toFixed(2) || "0.00",
      c.valor_bruto?.toFixed(2) || "0.00",
      c.valor_liquido?.toFixed(2) || "0.00",
      c.status || "",
    ]);

    // Adicionar totais
    const totalBruto =
      comissoes?.reduce(
        (acc: number, c: any) => acc + (c.valor_bruto || 0),
        0
      ) || 0;
    const totalLiquido =
      comissoes?.reduce(
        (acc: number, c: any) => acc + (c.valor_liquido || 0),
        0
      ) || 0;
    rows.push([]);
    rows.push([
      "",
      "",
      "",
      "",
      "",
      "TOTAL:",
      "",
      totalBruto.toFixed(2),
      totalLiquido.toFixed(2),
      "",
    ]);

    // Converter para CSV
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    // Adicionar BOM para Excel reconhecer UTF-8
    const bom = "\uFEFF";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=comissoes_${periodo || "todos"}_${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(bom + csvContent);
  })
);

// =====================================================
// PROJECAO DE FLUXO DE CAIXA
// =====================================================

// Projecao de fluxo de caixa para os proximos meses
router.get(
  "/projecao",
  asyncHandler(async (req: Request, res: Response) => {
    const { meses = 6 } = req.query;
    const numMeses = Math.min(Number(meses), 12);
    const now = new Date();

    // 1. Buscar renovacoes previstas (apolices que vencem nos proximos meses)
    const dataLimite = new Date(
      now.getFullYear(),
      now.getMonth() + numMeses,
      0
    );

    const { data: apolicesRenovar } = await supabase
      .from("apolices")
      .select(
        `
      id,
      numero_apolice,
      seguradora,
      ramo,
      valor_premio,
      data_fim,
      clientes (nome)
    `
      )
      .gte("data_fim", now.toISOString().split("T")[0])
      .lte("data_fim", dataLimite.toISOString().split("T")[0])
      .eq("status", "ativa");

    // 2. Buscar comissoes pendentes (que devem ser recebidas)
    const { data: comissoesPendentes } = await supabase
      .from("comissoes")
      .select(
        `
      id,
      valor_liquido,
      data_receita,
      apolices (numero_apolice, seguradora, clientes(nome))
    `
      )
      .eq("status", "pendente")
      .gte("data_receita", now.toISOString().split("T")[0])
      .lte("data_receita", dataLimite.toISOString().split("T")[0]);

    // 3. Buscar configuracoes de comissao para calcular receita esperada das renovacoes
    const { data: configs } = await supabase
      .from("comissao_configuracoes")
      .select("*")
      .eq("ativo", true);

    // Funcao para encontrar percentual de comissao
    const getPercentualComissao = (
      seguradora: string,
      ramo: string
    ): number => {
      let config = configs?.find(
        (c) => c.seguradora === seguradora && c.ramo === ramo
      );
      if (!config)
        config = configs?.find(
          (c) => c.seguradora === seguradora && c.ramo === "todos"
        );
      if (!config)
        config = configs?.find(
          (c) => c.seguradora === "Outros" && c.ramo === "todos"
        );
      return config?.percentual_comissao || 15; // Default 15%
    };

    // 4. Calcular projecao por mes
    const projecaoPorMes: Record<
      string,
      {
        mes: string;
        label: string;
        renovacoes: number;
        renovacoesValor: number;
        comissaoEsperada: number;
        comissoesPendentes: number;
        totalProjetado: number;
        detalhes: any[];
      }
    > = {};

    // Inicializar meses
    for (let i = 0; i < numMeses; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mesesAbrev = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      projecaoPorMes[key] = {
        mes: key,
        label: `${mesesAbrev[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        renovacoes: 0,
        renovacoesValor: 0,
        comissaoEsperada: 0,
        comissoesPendentes: 0,
        totalProjetado: 0,
        detalhes: [],
      };
    }

    // Processar renovacoes
    apolicesRenovar?.forEach((apolice: any) => {
      const dataFim = new Date(apolice.data_fim);
      const key = `${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, "0")}`;
      if (projecaoPorMes[key]) {
        const percentual = getPercentualComissao(
          apolice.seguradora,
          apolice.ramo
        );
        const comissaoEstimada =
          (apolice.valor_premio || 0) * (percentual / 100) * 0.85; // 85% liquido

        projecaoPorMes[key].renovacoes++;
        projecaoPorMes[key].renovacoesValor += apolice.valor_premio || 0;
        projecaoPorMes[key].comissaoEsperada += comissaoEstimada;
        projecaoPorMes[key].detalhes.push({
          tipo: "renovacao",
          descricao: `Renovacao ${apolice.numero_apolice} - ${apolice.clientes?.nome || "N/A"}`,
          valor: comissaoEstimada,
          data: apolice.data_fim,
          seguradora: apolice.seguradora,
        });
      }
    });

    // Processar comissoes pendentes
    comissoesPendentes?.forEach((comissao: any) => {
      const dataReceita = new Date(comissao.data_receita);
      const key = `${dataReceita.getFullYear()}-${String(dataReceita.getMonth() + 1).padStart(2, "0")}`;
      if (projecaoPorMes[key]) {
        projecaoPorMes[key].comissoesPendentes += comissao.valor_liquido || 0;
        projecaoPorMes[key].detalhes.push({
          tipo: "pendente",
          descricao: `Comissao pendente ${comissao.apolices?.numero_apolice || "N/A"} - ${comissao.apolices?.clientes?.nome || "N/A"}`,
          valor: comissao.valor_liquido,
          data: comissao.data_receita,
          seguradora: comissao.apolices?.seguradora,
        });
      }
    });

    // Calcular totais
    Object.keys(projecaoPorMes).forEach((key) => {
      projecaoPorMes[key].totalProjetado =
        projecaoPorMes[key].comissaoEsperada +
        projecaoPorMes[key].comissoesPendentes;
    });

    // 5. Buscar receita realizada nos ultimos meses para comparacao
    const mesAnteriorInicio = new Date(
      now.getFullYear(),
      now.getMonth() - numMeses,
      1
    );
    const { data: comissoesRealizadas } = await supabase
      .from("comissoes")
      .select("valor_liquido, data_receita")
      .in("status", ["recebida", "paga"])
      .gte("data_receita", mesAnteriorInicio.toISOString().split("T")[0])
      .lt("data_receita", now.toISOString().split("T")[0]);

    const realizadoPorMes: Record<string, number> = {};
    comissoesRealizadas?.forEach((c: any) => {
      const data = new Date(c.data_receita);
      const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      realizadoPorMes[key] =
        (realizadoPorMes[key] || 0) + (c.valor_liquido || 0);
    });

    // 6. Calcular totais gerais
    const projecaoArray = Object.values(projecaoPorMes);
    const totalRenovacoes = projecaoArray.reduce(
      (acc, m) => acc + m.renovacoes,
      0
    );
    const totalComissaoEsperada = projecaoArray.reduce(
      (acc, m) => acc + m.comissaoEsperada,
      0
    );
    const totalComissoesPendentes = projecaoArray.reduce(
      (acc, m) => acc + m.comissoesPendentes,
      0
    );
    const totalProjetado = projecaoArray.reduce(
      (acc, m) => acc + m.totalProjetado,
      0
    );
    const mediaRealizadoMensal =
      Object.values(realizadoPorMes).reduce((acc, v) => acc + v, 0) /
      Math.max(Object.keys(realizadoPorMes).length, 1);

    res.json({
      projecao: projecaoArray.map((m) => ({
        ...m,
        comissaoEsperada: Math.round(m.comissaoEsperada * 100) / 100,
        comissoesPendentes: Math.round(m.comissoesPendentes * 100) / 100,
        totalProjetado: Math.round(m.totalProjetado * 100) / 100,
      })),
      realizado: Object.entries(realizadoPorMes).map(([mes, valor]) => ({
        mes,
        valor: Math.round(valor * 100) / 100,
      })),
      totais: {
        renovacoes: totalRenovacoes,
        comissaoEsperadaRenovacoes:
          Math.round(totalComissaoEsperada * 100) / 100,
        comissoesPendentes: Math.round(totalComissoesPendentes * 100) / 100,
        totalProjetado: Math.round(totalProjetado * 100) / 100,
        mediaRealizadoMensal: Math.round(mediaRealizadoMensal * 100) / 100,
      },
    });
  })
);

export default router;
