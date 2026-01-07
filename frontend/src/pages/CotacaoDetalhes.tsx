import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Skeleton,
} from "../components/common";
import { useToast } from "../hooks/useToast";
import {
  useCotacao,
  useCreateCotacao,
  useUpdateCotacao,
  useConverterCotacao,
} from "../hooks/useCotacoesPropostas";
import { useClientes } from "../hooks/useClientes";
import { Cotacao, RamoSeguro } from "../types";

// Tipos do formulário
interface CotacaoForm {
  cliente_id?: string;
  tipo_cliente: "existente" | "novo";
  lead_nome?: string;
  lead_telefone?: string;
  ramo: RamoSeguro;
  dados_cotacao: {
    modelo: string;
    ano_modelo: string;
    placa?: string;
    uso?: string;
    observacoes?: string;
  };
  validade_cotacao: string;
  seguradoras_json: {
    seguradora: string;
    valor: number;
    coberturas: string; // Descrição simples das coberturas
    franquia?: number;
  }[];
}

const RAMOS = [
  { value: "auto", label: "Automóvel" },
  { value: "residencial", label: "Residencial" },
  { value: "vida", label: "Vida" },
  { value: "saude", label: "Saúde" },
  { value: "empresarial", label: "Empresarial" },
  { value: "outros", label: "Outros" },
];

export default function CotacaoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === "nova";

  // Buscar dados se for edição
  const { data: cotacaoData, isLoading: loadingCotacao } = useCotacao(
    isNew ? undefined : id
  );
  const cotacao = cotacaoData as Cotacao;

  // Se a cotação já virou proposta, precisamos dos dados da proposta também
  // O backend não retorna o ID da proposta na cotação diretamente, mas podemos inferir ou buscar
  // Por simplicidade, assumimos que se não é nova, verificamos o status/proposta

  const { data: clientesData, isLoading: loadingClientes } = useClientes({
    limit: 100,
  });
  const clientes = clientesData?.data || [];

  const createMutation = useCreateCotacao();
  const updateMutation = useUpdateCotacao();
  const converterMutation = useConverterCotacao();

  const [convertingOption, setConvertingOption] = useState<number | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CotacaoForm>({
    shouldUnregister: true, // Unregister fields when unmounted so validation doesn't trigger
    defaultValues: {
      tipo_cliente: "existente",
      ramo: "auto",
      seguradoras_json: [{ seguradora: "", valor: 0, coberturas: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "seguradoras_json",
  });

  useEffect(() => {
    if (cotacao) {
      reset({
        cliente_id: cotacao.cliente_id,
        tipo_cliente: cotacao.cliente_id ? "existente" : "novo",
        lead_nome: cotacao.lead_nome,
        lead_telefone: cotacao.lead_telefone,
        ramo: cotacao.ramo,
        dados_cotacao: cotacao.dados_cotacao || {},
        validade_cotacao: cotacao.validade_cotacao
          ? new Date(cotacao.validade_cotacao).toISOString().split("T")[0]
          : "",
        seguradoras_json: Array.isArray(cotacao.seguradoras_json)
          ? cotacao.seguradoras_json
          : [],
      });
    }
  }, [cotacao, reset]);

  const onSubmit = async (data: CotacaoForm) => {
    try {
      // Clean up payload based on type
      const payload = { ...data };
      if (data.tipo_cliente === "novo") {
        delete payload.cliente_id;
      } else {
        delete payload.lead_nome;
        delete payload.lead_telefone;
      }

      if (isNew) {
        await createMutation.mutateAsync(payload);
        toast({
          title: "Cotação criada!",
          description: "A cotação foi salva com sucesso.",
          type: "success",
        });
        navigate("/cotacoes");
      } else {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({
          title: "Cotação atualizada!",
          description: "As alterações foram salvas.",
          type: "success",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a cotação.",
        type: "error",
      });
    }
  };

  const handleConvertToProposal = async () => {
    if (convertingOption === null) return;

    try {
      const selectedOption = watch(`seguradoras_json.${convertingOption}`);

      // Preparar objeto de proposta baseado na opção escolhida
      const propostaData = {
        seguradora: selectedOption.seguradora,
        valor: selectedOption.valor,
        coberturas: selectedOption.coberturas,
        franquia: selectedOption.franquia,
        detalhes_origem: watch("dados_cotacao"),
      };

      await converterMutation.mutateAsync({
        id: id!,
        proposta: propostaData,
      });

      toast({
        title: "Sucesso!",
        description: "Cotação convertida em proposta.",
        type: "success",
      });
      setShowConvertModal(false);
      navigate("/cotacoes"); // Ou redirecionar para detalhes da proposta se existir
    } catch (error) {
      toast({
        title: "Erro na conversão",
        description: "Não foi possível converter a cotação.",
        type: "error",
      });
    }
  };

  if (!isNew && loadingCotacao) {
    return (
      <PageLayout title="Carregando..." subtitle="Aguarde um momento">
        <div className="space-y-4">
          <Skeleton height={200} />
          <Skeleton height={300} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isNew ? "Nova Cotação" : "Detalhes da Cotação"}
      subtitle={
        isNew
          ? "Preencha os dados para criar uma nova cotação"
          : `Cotação #${id?.slice(0, 8)}`
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/cotacoes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Cotação
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Dados Básicos */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              Dados Gerais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full mb-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="existente"
                      {...register("tipo_cliente")}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Cliente Existente
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="novo"
                      {...register("tipo_cliente")}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Novo Lead (Prospecção)
                    </span>
                  </label>
                </div>
              </div>

              {watch("tipo_cliente") === "existente" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <Controller
                    control={control}
                    name="cliente_id"
                    rules={{ required: "Selecione um cliente" }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={clientes.map((c) => ({
                          value: c.id,
                          label: c.nome,
                        }))}
                        error={errors.cliente_id?.message}
                      />
                    )}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome do Lead
                    </label>
                    <Input
                      placeholder="Nome completo"
                      {...register("lead_nome", {
                        required: "Nome do lead é obrigatório",
                      })}
                      error={errors.lead_nome?.message}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <Input
                      placeholder="(00) 00000-0000"
                      {...register("lead_telefone")}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ramo
                </label>
                <Controller
                  control={control}
                  name="ramo"
                  rules={{ required: "Selecione o ramo" }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={RAMOS}
                      error={errors.ramo?.message}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Validade
                </label>
                <Input type="date" {...register("validade_cotacao")} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-slate-800 mb-4">
              Detalhes do Item (Risco)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Modelo / Item Segurado"
                placeholder="Ex: Honda Civic 2024"
                {...register("dados_cotacao.modelo", {
                  required: "Campo obrigatório",
                })}
                error={errors.dados_cotacao?.modelo?.message}
              />
              <Input
                label="Ano Modelo"
                placeholder="Ex: 2024/2024"
                {...register("dados_cotacao.ano_modelo")}
              />
              <Input
                label="Placa / Identificação"
                placeholder="Ex: ABC-1234"
                {...register("dados_cotacao.placa")}
              />
              <Input
                label="Uso"
                placeholder="Ex: Particular, Uber, Comercial"
                {...register("dados_cotacao.uso")}
              />
              <div className="col-span-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none h-24"
                  placeholder="Informações adicionais sobre o risco..."
                  {...register("dados_cotacao.observacoes")}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral - Opções de Seguradoras */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">
              Opções de Cotação
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                append({ seguradora: "", valor: 0, coberturas: "" })
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {!isNew && (
                    <button
                      type="button"
                      onClick={() => {
                        setConvertingOption(index);
                        setShowConvertModal(true);
                      }}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Converter em Proposta"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Remover opção"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Nome da Seguradora"
                    {...register(
                      `seguradoras_json.${index}.seguradora` as const,
                      { required: true }
                    )}
                    className="font-medium"
                  />

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">
                        Valor Anual
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        leftIcon={
                          <span className="text-slate-400 text-xs">R$</span>
                        }
                        {...register(
                          `seguradoras_json.${index}.valor` as const,
                          { valueAsNumber: true }
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Franquia</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        leftIcon={
                          <span className="text-slate-400 text-xs">R$</span>
                        }
                        {...register(
                          `seguradoras_json.${index}.franquia` as const,
                          { valueAsNumber: true }
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Resumo Coberturas
                    </label>
                    <textarea
                      rows={2}
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Ex: 100% FIPE, 50k Danos Materiais..."
                      {...register(
                        `seguradoras_json.${index}.coberturas` as const
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            {fields.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <p className="text-sm">Nenhuma opção adicionada</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    append({ seguradora: "", valor: 0, coberturas: "" })
                  }
                  className="mt-2"
                >
                  Adicionar Opção
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Conversão */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Converter em Proposta"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Você está prestes a converter a opção da{" "}
            <strong>
              {convertingOption !== null &&
                watch(`seguradoras_json.${convertingOption}.seguradora`)}
            </strong>{" "}
            em uma proposta formal.
          </p>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
              Isso criará um novo registro de Proposta vinculado a este cliente
              e moverá o fluxo para a fase de fechamento.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowConvertModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConvertToProposal}>
              Confirmar Conversão
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
