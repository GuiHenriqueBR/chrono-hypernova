import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Circle,
  FileText,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  Loader2,
} from "lucide-react";
import { Card, Button, Modal, ModalFooter, Input, Badge } from "./common";
import {
  useChecklistSinistro,
  useAtualizarItemChecklist,
  useAdicionarItemChecklist,
  useRemoverItemChecklist,
  useResetarChecklist,
  ChecklistItem,
} from "../hooks/useSinistroChecklist";

interface SinistroChecklistProps {
  sinistroId: string;
  documentos?: { id: string; nome_arquivo: string; tipo: string }[];
  onVincularDocumento?: (itemId: string, documentoId: string) => void;
}

export function SinistroChecklist({
  sinistroId,
  documentos = [],
  onVincularDocumento,
}: SinistroChecklistProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [novoDocumento, setNovoDocumento] = useState("");
  const [novoObrigatorio, setNovoObrigatorio] = useState(false);

  // Queries e mutations
  const { data: checklist, isLoading } = useChecklistSinistro(sinistroId);
  const atualizarItem = useAtualizarItemChecklist();
  const adicionarItem = useAdicionarItemChecklist();
  const removerItem = useRemoverItemChecklist();
  const resetarChecklist = useResetarChecklist();

  const handleToggleRecebido = (item: ChecklistItem) => {
    atualizarItem.mutate({
      sinistroId,
      itemId: item.id,
      dados: { recebido: !item.recebido },
    });
  };

  const handleToggleAprovado = (item: ChecklistItem) => {
    atualizarItem.mutate({
      sinistroId,
      itemId: item.id,
      dados: { aprovado: !item.aprovado },
    });
  };

  const handleAdicionarItem = () => {
    if (!novoDocumento.trim()) return;

    adicionarItem.mutate(
      {
        sinistroId,
        nome_documento: novoDocumento,
        obrigatorio: novoObrigatorio,
      },
      {
        onSuccess: () => {
          setNovoDocumento("");
          setNovoObrigatorio(false);
          setShowAddModal(false);
        },
      }
    );
  };

  const handleRemoverItem = (item: ChecklistItem) => {
    if (confirm(`Remover "${item.nome_documento}" do checklist?`)) {
      removerItem.mutate({ sinistroId, itemId: item.id });
    }
  };

  const handleResetarChecklist = () => {
    if (
      confirm(
        "Resetar o checklist para o padrao do ramo? Todos os dados serao perdidos."
      )
    ) {
      resetarChecklist.mutate(sinistroId);
    }
  };

  const handleVincular = (item: ChecklistItem) => {
    setSelectedItem(item);
    setShowVincularModal(true);
  };

  const handleSelecionarDocumento = (documentoId: string) => {
    if (selectedItem && onVincularDocumento) {
      onVincularDocumento(selectedItem.id, documentoId);
    }
    atualizarItem.mutate({
      sinistroId,
      itemId: selectedItem!.id,
      dados: { documento_id: documentoId, recebido: true },
    });
    setShowVincularModal(false);
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </Card>
    );
  }

  const itens = checklist?.itens || [];
  const progresso = checklist?.progresso || {
    total: 0,
    recebidos: 0,
    aprovados: 0,
    percentual_recebido: 0,
    percentual_aprovado: 0,
  };

  return (
    <div className="space-y-4">
      {/* Cabecalho com progresso */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Checklist de Documentos
          </h3>
          <p className="text-sm text-slate-500">
            {progresso.recebidos} de {progresso.total} documentos recebidos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetarChecklist}
            disabled={resetarChecklist.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${
                resetarChecklist.isPending ? "animate-spin" : ""
              }`}
            />
            Resetar
          </Button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">
            Recebidos: {progresso.percentual_recebido}%
          </span>
          <span className="text-slate-600">
            Aprovados: {progresso.percentual_aprovado}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${progresso.percentual_aprovado}%` }}
            />
            <div
              className="bg-yellow-400 transition-all"
              style={{
                width: `${
                  progresso.percentual_recebido - progresso.percentual_aprovado
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <Card className="divide-y divide-slate-100">
        {itens.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nenhum item no checklist</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowAddModal(true)}
            >
              Adicionar primeiro item
            </Button>
          </div>
        ) : (
          itens.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Status de recebido */}
                <button
                  onClick={() => handleToggleRecebido(item)}
                  className="shrink-0 focus:outline-none"
                  disabled={atualizarItem.isPending}
                >
                  {item.recebido ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400" />
                  )}
                </button>

                {/* Info do documento */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        item.recebido ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {item.nome_documento}
                    </span>
                    {item.obrigatorio && (
                      <Badge variant="error" className="text-xs">
                        Obrigatorio
                      </Badge>
                    )}
                    {item.documento && (
                      <Badge variant="info" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        Vinculado
                      </Badge>
                    )}
                  </div>
                  {item.observacao && (
                    <p className="text-sm text-slate-500 mt-1">
                      {item.observacao}
                    </p>
                  )}
                  {item.data_recebimento && (
                    <p className="text-xs text-slate-400 mt-1">
                      Recebido em:{" "}
                      {new Date(item.data_recebimento).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  )}
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-2">
                  {/* Aprovacao */}
                  {item.recebido && (
                    <button
                      onClick={() => handleToggleAprovado(item)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.aprovado
                          ? "bg-green-100 text-green-600"
                          : "bg-slate-100 text-slate-400 hover:text-slate-600"
                      }`}
                      title={
                        item.aprovado ? "Aprovado" : "Marcar como aprovado"
                      }
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {/* Vincular documento */}
                  {!item.documento_id && documentos.length > 0 && (
                    <button
                      onClick={() => handleVincular(item)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors"
                      title="Vincular documento"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Remover */}
                  <button
                    onClick={() => handleRemoverItem(item)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                    title="Remover do checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </Card>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Circle className="w-3 h-3 text-slate-300" /> Pendente
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" /> Recebido
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" /> Aprovado
        </span>
      </div>

      {/* Modal Adicionar Item */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Adicionar Documento ao Checklist"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome do Documento
            </label>
            <Input
              value={novoDocumento}
              onChange={(e) => setNovoDocumento(e.target.value)}
              placeholder="Ex: Laudo Pericial"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={novoObrigatorio}
              onChange={(e) => setNovoObrigatorio(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-600">
              Documento obrigatorio
            </span>
          </label>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdicionarItem}
            disabled={!novoDocumento.trim() || adicionarItem.isPending}
          >
            {adicionarItem.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Adicionar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Vincular Documento */}
      <Modal
        isOpen={showVincularModal}
        onClose={() => {
          setShowVincularModal(false);
          setSelectedItem(null);
        }}
        title="Vincular Documento"
        size="md"
      >
        <div className="space-y-2">
          <p className="text-sm text-slate-600 mb-4">
            Selecione um documento para vincular a "
            {selectedItem?.nome_documento}"
          </p>

          {documentos.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              Nenhum documento disponivel para vincular
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {documentos.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelecionarDocumento(doc.id)}
                  className="w-full p-3 text-left border border-slate-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {doc.nome_arquivo}
                      </p>
                      <p className="text-xs text-slate-500">{doc.tipo}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowVincularModal(false);
              setSelectedItem(null);
            }}
          >
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default SinistroChecklist;
