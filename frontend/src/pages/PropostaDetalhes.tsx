import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  DollarSign,
  Shield,
  User,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Skeleton,
} from "../components/common";
import { useToast } from "../hooks/useToast";
import {
  useProposta,
  useUpdatePropostaStatus,
  useEmitirProposta,
} from "../hooks/useCotacoesPropostas";
import { Proposta, StatusProposta } from "../types";

const statusColors: Record<
  StatusProposta,
  "neutral" | "info" | "success" | "error"
> = {
  rascunho: "neutral",
  enviada: "info",
  aceita: "success",
  recusada: "error",
};

const statusLabels: Record<StatusProposta, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada ao Cliente",
  aceita: "Aceita",
  recusada: "Recusada",
};

interface EmissaoForm {
  numero_apolice: string;
  data_inicio: string;
  data_vencimento: string;
}

export default function PropostaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: propostaData, isLoading, refetch } = useProposta(id);
  const updateStatus = useUpdatePropostaStatus();
  const emitirProposta = useEmitirProposta();

  const [showEmitirModal, setShowEmitirModal] = useState(false);

  const proposta = propostaData as Proposta;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmissaoForm>();

  // Pre-fill dates when modal opens or proposal loads
  useEffect(() => {
    if (showEmitirModal) {
      const today = new Date().toISOString().split("T")[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearStr = nextYear.toISOString().split("T")[0];

      setValue("data_inicio", today);
      setValue("data_vencimento", nextYearStr);
    }
  }, [showEmitirModal, setValue]);

  const handleStatusChange = async (newStatus: StatusProposta) => {
    try {
      await updateStatus.mutateAsync({ id: id!, status: newStatus });
      toast({
        title: "Status atualizado",
        description: `Proposta marcada como ${statusLabels[newStatus]}`,
        type: "success",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o status.",
        type: "error",
      });
    }
  };

  const handleEmitir = async (data: EmissaoForm) => {
    try {
      await emitirProposta.mutateAsync({
        id: id!,
        data: {
          numero_apolice: data.numero_apolice,
          data_inicio: data.data_inicio,
          data_vencimento: data.data_vencimento,
          seguradora: proposta.dados_propostos?.seguradora, // Pass seguradora explicitly if needed by backend logic or handled there
        },
      });

      toast({
        title: "Apólice Emitida!",
        description: "A apólice foi gerada com sucesso.",
        type: "success",
      });

      setShowEmitirModal(false);
      navigate("/apolices"); // Redirect to policies list or the new policy details
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na emissão",
        description: "Não foi possível emitir a apólice.",
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Carregando..." subtitle="">
        <div className="space-y-4">
          <Skeleton height={200} />
          <Skeleton height={300} />
        </div>
      </PageLayout>
    );
  }

  if (!proposta) return null;

  return (
    <PageLayout
      title={`Proposta #${id?.slice(0, 8)}`}
      subtitle={`Gerada em ${new Date(
        proposta.data_criacao
      ).toLocaleDateString()}`}
      actions={
        <Button variant="outline" onClick={() => navigate("/cotacoes")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Detalhes da Proposta
                </h3>
                <p className="text-slate-500 text-sm">
                  Informações consolidadas da cotação
                </p>
              </div>
              <Badge variant={statusColors[proposta.status]} size="lg">
                {statusLabels[proposta.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Cliente</span>
                </div>
                <p className="font-semibold text-slate-800 text-lg">
                  {proposta.clientes?.nome || "Cliente não identificado"}
                </p>
                <p className="text-sm text-slate-500">
                  {proposta.clientes?.email}
                </p>
                <p className="text-sm text-slate-500">
                  {proposta.clientes?.telefone}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Seguradora e Ramo</span>
                </div>
                <p className="font-semibold text-slate-800 text-lg">
                  {proposta.dados_propostos?.seguradora || "N/A"}
                </p>
                <Badge variant="neutral" className="mt-1">
                  {proposta.ramo?.toUpperCase()}
                </Badge>
              </div>

              <div className="col-span-full bg-violet-50 border border-violet-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-700">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Valor Proposto</span>
                  </div>
                  <span className="text-2xl font-bold text-violet-700">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(proposta.valor_proposto)}
                  </span>
                </div>
                {proposta.dados_propostos?.franquia && (
                  <div className="mt-2 pt-2 border-t border-violet-200 flex justify-between text-sm text-violet-600">
                    <span>Franquia:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(proposta.dados_propostos.franquia)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Resumo das Coberturas
              </h4>
              <div className="bg-white border border-slate-200 p-4 rounded-lg text-sm text-slate-600 whitespace-pre-line">
                {proposta.dados_propostos?.coberturas ||
                  "Sem descrição de coberturas."}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Dados do Item (Risco)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">Modelo:</span>
                  <span className="font-medium text-slate-800">
                    {proposta.dados_propostos?.detalhes_origem?.modelo || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Placa:</span>
                  <span className="font-medium text-slate-800">
                    {proposta.dados_propostos?.detalhes_origem?.placa || "-"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">
                    Observações Originais:
                  </span>
                  <span className="text-slate-800">
                    {proposta.dados_propostos?.detalhes_origem?.observacoes ||
                      "-"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna de Ações */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-medium text-slate-800 mb-4">
              Fluxo da Proposta
            </h3>

            <div className="space-y-3">
              {proposta.status === "rascunho" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("enviada")}
                >
                  <Send className="w-4 h-4 mr-2 text-blue-500" />
                  Marcar como Enviada
                </Button>
              )}

              {(proposta.status === "enviada" ||
                proposta.status === "rascunho") && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                    onClick={() => handleStatusChange("aceita")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Cliente Aceitou
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                    onClick={() => handleStatusChange("recusada")}
                  >
                    <XCircle className="w-4 h-4 mr-2 text-red-500" />
                    Cliente Recusou
                  </Button>
                </>
              )}

              {proposta.status === "aceita" && (
                <Button
                  variant="primary"
                  className="w-full justify-center py-6 text-lg shadow-lg shadow-violet-200"
                  onClick={() => setShowEmitirModal(true)}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  EMITIR APÓLICE
                </Button>
              )}

              {proposta.status === "recusada" && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    Esta proposta foi recusada. Você pode reabrí-la voltando
                    para rascunho se necessário.
                  </p>
                </div>
              )}
              {proposta.status === "recusada" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange("rascunho")}
                >
                  Reabrir como Rascunho
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-medium text-slate-800 mb-2">Histórico</h3>
            <div className="text-sm text-slate-500 space-y-2">
              <div className="flex justify-between">
                <span>Criada em:</span>
                <span>
                  {new Date(proposta.data_criacao).toLocaleDateString()}
                </span>
              </div>
              {proposta.data_envio && (
                <div className="flex justify-between">
                  <span>Enviada em:</span>
                  <span>
                    {new Date(proposta.data_envio).toLocaleDateString()}
                  </span>
                </div>
              )}
              {proposta.data_aceitacao && (
                <div className="flex justify-between font-medium text-green-600">
                  <span>Aceita em:</span>
                  <span>
                    {new Date(proposta.data_aceitacao).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Emissão */}
      <Modal
        isOpen={showEmitirModal}
        onClose={() => setShowEmitirModal(false)}
        title="Emitir Apólice Definitiva"
      >
        <form onSubmit={handleSubmit(handleEmitir)} className="space-y-4">
          <div className="bg-violet-50 p-3 rounded-lg text-sm text-violet-800 mb-4">
            Confirme os dados abaixo para gerar o registro oficial da apólice no
            sistema.
          </div>

          <Input
            label="Número da Apólice (Seguradora)"
            placeholder="Ex: 001.234.567"
            {...register("numero_apolice", {
              required: "O número é obrigatório",
            })}
            error={errors.numero_apolice?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Início de Vigência"
              {...register("data_inicio", { required: true })}
            />
            <Input
              type="date"
              label="Fim de Vigência"
              {...register("data_vencimento", { required: true })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEmitirModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar Emissão
            </Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
