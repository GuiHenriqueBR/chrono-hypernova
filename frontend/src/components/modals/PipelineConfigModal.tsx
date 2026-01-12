import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Modal, ModalFooter, Button, Input } from "../common";
import { api } from "../../services/api";
import { PipelineFase } from "../../hooks/useCotacoesPropostas";

interface PipelineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  fases: PipelineFase[];
  onUpdate: () => void; // Refresh list
}

export function PipelineConfigModal({
  isOpen,
  onClose,
  fases,
  onUpdate,
}: PipelineConfigModalProps) {
  const [newFaseName, setNewFaseName] = useState("");
  const [selectedColor, setSelectedColor] = useState("slate");
  const [loading, setLoading] = useState(false);

  const colors = [
    { value: "slate", label: "Cinza", bg: "bg-slate-500" },
    { value: "blue", label: "Azul", bg: "bg-blue-500" },
    { value: "indigo", label: "Índigo", bg: "bg-indigo-500" },
    { value: "violet", label: "Violeta", bg: "bg-violet-500" },
    { value: "emerald", label: "Verde", bg: "bg-emerald-500" },
    { value: "red", label: "Vermelho", bg: "bg-red-500" },
    { value: "amber", label: "Amarelo", bg: "bg-amber-500" },
  ];

  const handleAdd = async () => {
    if (!newFaseName.trim()) return;
    setLoading(true);
    try {
      await api.post("/pipeline/fases", {
        nome: newFaseName,
        cor: selectedColor,
        ordem:
          fases.length > 0 ? Math.max(...fases.map((f) => f.ordem)) + 1 : 1,
      });
      setNewFaseName("");
      setSelectedColor("slate");
      onUpdate();
    } catch (error) {
      console.error("Erro ao criar fase:", error);
      alert(
        "Erro ao criar fase. Verifique se o nome é único ou tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta fase?")) return;
    setLoading(true);
    try {
      await api.delete(`/pipeline/fases/${id}`);
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      const errorMessage =
        error.response?.data?.error || "Erro ao deletar fase.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newItems = [...fases];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Local swap for immediate feedback could be here, but using simple approach
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];

    const orderData = newItems.map((f, i) => ({ id: f.id, ordem: i + 1 }));

    setLoading(true);
    try {
      await api.post("/pipeline/fases/reordenar", { ordem: orderData });
      onUpdate();
    } catch (error) {
      console.error("Erro ao reordenar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Pipeline"
      size="md"
    >
      <div className="space-y-6">
        {/* Adicionar Nova */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <label className="block text-sm font-medium text-slate-700">
            Nova Coluna
          </label>
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
              <Input
                value={newFaseName}
                onChange={(e) => setNewFaseName(e.target.value)}
                placeholder="Nome da fase (ex: Em Análise)"
                className="bg-white"
              />
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-all ${c.bg} ${
                      selectedColor === c.value
                        ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                        : "hover:scale-110 opacity-70 hover:opacity-100"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={loading || !newFaseName}
              className="h-10 self-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2 max-h-100 overflow-y-auto pr-2">
          {fases.map((fase, index) => (
            <div
              key={fase.id}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-violet-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-${fase.cor}-500`} />
                <span className="font-medium text-slate-700">{fase.nome}</span>
                {fase.sistema && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Sistema
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {!fase.sistema && (
                  <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={loading || index === 0}
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={loading || index === fases.length - 1}
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!fase.sistema && (
                  <button
                    onClick={() => handleDelete(fase.id)}
                    disabled={loading}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Concluir
        </Button>
      </ModalFooter>
    </Modal>
  );
}
