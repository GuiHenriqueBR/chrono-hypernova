import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import { Button, Card } from "../components/common";
import { FileUpload } from "../components/common";
import { Badge, EmptyState } from "../components/common";
import {
  useImportacao,
  useImportacaoHistorico,
  useDownloadTemplate,
  type PreviewResultado,
} from "../hooks/useImportacao";

// Campos disponíveis por tipo
const CAMPOS_SISTEMA = {
  clientes: [
    { value: "nome", label: "Nome" },
    { value: "cpf_cnpj", label: "CPF/CNPJ" },
    { value: "email", label: "Email" },
    { value: "telefone", label: "Telefone" },
    { value: "tipo", label: "Tipo (PF/PJ)" },
    { value: "cidade", label: "Cidade" },
    { value: "estado", label: "Estado" },
    { value: "cep", label: "CEP" },
  ],
  apolices: [
    { value: "numero_apolice", label: "Número da Apólice" },
    { value: "cliente_cpf_cnpj", label: "CPF/CNPJ do Cliente" },
    { value: "seguradora", label: "Seguradora" },
    { value: "ramo", label: "Ramo" },
    { value: "valor_premio", label: "Valor do Prêmio" },
    { value: "data_inicio", label: "Data de Início" },
    { value: "data_vencimento", label: "Data de Vencimento" },
  ],
  comissoes: [
    { value: "numero_apolice", label: "Número da Apólice" },
    { value: "valor_bruto", label: "Valor Bruto" },
    { value: "valor_liquido", label: "Valor Líquido" },
    { value: "data_receita", label: "Data da Receita" },
    { value: "status", label: "Status" },
  ],
};

type TipoImportacao = "clientes" | "apolices" | "comissoes";
type Step = "upload" | "mapeamento" | "preview" | "concluir";

export default function Importacao() {
  const [step, setStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoImportacao>("clientes");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewLinhas, setPreviewLinhas] = useState<Record<string, unknown>[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [previewResultados, setPreviewResultados] = useState<PreviewResultado[]>([]);
  const [resumoPreview, setResumoPreview] = useState({ total: 0, validos: 0, invalidos: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<{ total: number; importados: number; erros: number } | null>(null);
  const [errosImportacao, setErrosImportacao] = useState<string[]>([]);

  const { upload, isUploading, preview, isPreviewing, importar, isImporting, uploadError } = useImportacao();
  const { data: historicoData, isLoading: isLoadingHistorico, refetch: refetchHistorico } = useImportacaoHistorico();
  const { downloadTemplate } = useDownloadTemplate();

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    
    try {
      const result = await upload({ arquivo: file, tipo: selectedTipo });
      
      setHeaders(result.headers);
      setPreviewLinhas(result.previewLinhas);
      
      // Auto-mapear campos similares
      const autoMapeamento: Record<string, string> = {};
      const camposDisponiveis = CAMPOS_SISTEMA[selectedTipo];
      
      result.headers.forEach((header) => {
        const headerNormalizado = header.toLowerCase().replace(/[^a-z]/g, '');
        const campoMatch = camposDisponiveis.find(
          (c) => c.value.toLowerCase().replace(/[^a-z]/g, '').includes(headerNormalizado) ||
                 headerNormalizado.includes(c.value.toLowerCase().replace(/[^a-z]/g, ''))
        );
        if (campoMatch) {
          autoMapeamento[header] = campoMatch.value;
        }
      });
      
      setMapeamento(autoMapeamento);
      setStep("mapeamento");
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  }, [upload, selectedTipo]);

  const handlePreview = useCallback(async () => {
    try {
      const result = await preview({
        tipo: selectedTipo,
        dados: previewLinhas,
        mapeamento,
      });
      
      setPreviewResultados(result.resultados);
      setResumoPreview(result.resumo);
      setStep("preview");
    } catch (error) {
      console.error('Erro no preview:', error);
    }
  }, [preview, selectedTipo, previewLinhas, mapeamento]);

  const handleImport = useCallback(async () => {
    try {
      const result = await importar({
        tipo: selectedTipo,
        dados: previewLinhas,
        mapeamento,
        nomeArquivo: uploadedFile?.name || 'importacao.xlsx',
      });
      
      setResultadoFinal(result.resultado);
      setErrosImportacao(result.detalhesErros);
      setStep("concluir");
      refetchHistorico();
    } catch (error) {
      console.error('Erro na importação:', error);
    }
  }, [importar, selectedTipo, previewLinhas, mapeamento, uploadedFile, refetchHistorico]);

  const handleBack = () => {
    if (step === "mapeamento") setStep("upload");
    else if (step === "preview") setStep("mapeamento");
  };

  const resetImportacao = () => {
    setStep("upload");
    setUploadedFile(null);
    setHeaders([]);
    setPreviewLinhas([]);
    setMapeamento({});
    setPreviewResultados([]);
    setResumoPreview({ total: 0, validos: 0, invalidos: 0 });
    setResultadoFinal(null);
    setErrosImportacao([]);
  };

  const handleMapeamentoChange = (header: string, campo: string) => {
    setMapeamento((prev) => ({
      ...prev,
      [header]: campo,
    }));
  };

  return (
    <PageLayout title="Importacao" subtitle="Importar dados de planilhas Excel">
      <div className="space-y-6">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Upload", "Mapeamento", "Preview", "Concluir"].map((label, index) => {
            const steps: Step[] = ["upload", "mapeamento", "preview", "concluir"];
            const isActive = steps.indexOf(step) >= index;

            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                    ${isActive ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400"}
                  `}
                >
                  {index + 1}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-violet-600" : "text-slate-400"}`}>
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-12 h-0.5 ${isActive ? "bg-violet-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Importar Dados</h3>
                <p className="text-sm text-slate-500">
                  Selecione o tipo de dados e faca upload do arquivo Excel (.xlsx ou .csv)
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Dados</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "clientes" as const, label: "Clientes" },
                    { value: "apolices" as const, label: "Apolices" },
                    { value: "comissoes" as const, label: "Comissoes" },
                  ].map((tipo) => (
                    <button
                      key={tipo.value}
                      onClick={() => setSelectedTipo(tipo.value)}
                      className={`
                        p-4 rounded-xl border transition-all
                        ${
                          selectedTipo === tipo.value
                            ? "bg-violet-50 border-violet-200 text-violet-700"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }
                      `}
                    >
                      <p className="text-sm font-medium">{tipo.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => downloadTemplate(selectedTipo)}
                >
                  Baixar Template de Exemplo
                </Button>
              </div>

              <FileUpload
                onFileSelect={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                maxSize={10 * 1024 * 1024}
                isLoading={isUploading}
              />

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{uploadError.message}</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2: Mapeamento */}
        {step === "mapeamento" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Mapear Colunas</h3>
                  <p className="text-sm text-slate-500">
                    Defina qual coluna do arquivo corresponde a qual campo do sistema
                  </p>
                </div>
                {uploadedFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{uploadedFile.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg"
                  >
                    <ArrowRight className="w-4 h-4 text-violet-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 mb-1">Coluna do Arquivo</p>
                      <p className="text-sm text-slate-600">{header}</p>
                      {previewLinhas[0] && (
                        <p className="text-xs text-slate-400 mt-1">
                          Ex: {String(previewLinhas[0][header] || '-')}
                        </p>
                      )}
                    </div>

                    <div className="px-3 py-1 bg-slate-100 rounded">
                      <span className="text-xs font-medium text-slate-500">-&gt;</span>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 mb-1">Campo do Sistema</p>
                      <select
                        value={mapeamento[header] || ''}
                        onChange={(e) => handleMapeamentoChange(header, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                      >
                        <option value="">-- Ignorar coluna --</option>
                        {CAMPOS_SISTEMA[selectedTipo].map((campo) => (
                          <option key={campo.value} value={campo.value}>
                            {campo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={handleBack}>
                  Voltar
                </Button>
                <Button
                  onClick={handlePreview}
                  leftIcon={isPreviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  disabled={isPreviewing || Object.values(mapeamento).filter(Boolean).length === 0}
                >
                  {isPreviewing ? 'Validando...' : 'Proximo'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Preview dos Dados</h3>
                  <p className="text-sm text-slate-500">
                    Revise os dados antes de confirmar a importacao
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">
                      {resumoPreview.validos} validos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      {resumoPreview.invalidos} com erros
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                        Linha
                      </th>
                      {Object.entries(mapeamento)
                        .filter(([, campo]) => campo)
                        .map(([header, campo]) => (
                          <th
                            key={header}
                            className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3"
                          >
                            {CAMPOS_SISTEMA[selectedTipo].find((c) => c.value === campo)?.label || campo}
                          </th>
                        ))}
                      <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResultados.slice(0, 20).map((resultado) => (
                      <tr
                        key={resultado.linha}
                        className={!resultado.valido ? "bg-red-50/50" : ""}
                      >
                        <td className="px-4 py-3 text-sm text-slate-600">{resultado.linha}</td>
                        {Object.entries(mapeamento)
                          .filter(([, campo]) => campo)
                          .map(([header, campo]) => (
                            <td key={header} className="px-4 py-3 text-sm text-slate-800">
                              {String(resultado.dados[campo] || '-')}
                            </td>
                          ))}
                        <td className="px-4 py-3">
                          {resultado.valido ? (
                            <Badge variant="success" size="sm">Valido</Badge>
                          ) : (
                            <div>
                              <Badge variant="error" size="sm">Erro</Badge>
                              <p className="text-xs text-red-600 mt-1">
                                {resultado.erros.join(', ')}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewResultados.length > 20 && (
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Mostrando 20 de {previewResultados.length} registros
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={handleBack}>
                  Voltar
                </Button>
                <Button
                  onClick={handleImport}
                  leftIcon={isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  disabled={isImporting || resumoPreview.validos === 0}
                >
                  {isImporting ? 'Importando...' : `Importar ${resumoPreview.validos} Registros`}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Concluir */}
        {step === "concluir" && resultadoFinal && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>

              <h3 className="text-xl font-semibold text-slate-800 mb-2">Importacao Concluida!</h3>

              <p className="text-sm text-slate-500 mb-6">
                {resultadoFinal.importados} registros importados com sucesso
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Total de linhas</span>
                  <span className="text-sm font-semibold text-slate-800">{resultadoFinal.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-emerald-700">Importados</span>
                  <span className="text-sm font-semibold text-emerald-800">{resultadoFinal.importados}</span>
                </div>
                {resultadoFinal.erros > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">Com erros</span>
                    <span className="text-sm font-semibold text-red-800">{resultadoFinal.erros}</span>
                  </div>
                )}
              </div>

              {errosImportacao.length > 0 && (
                <div className="mb-6 text-left">
                  <p className="text-sm font-medium text-slate-700 mb-2">Detalhes dos erros:</p>
                  <div className="max-h-40 overflow-y-auto p-3 bg-red-50 rounded-lg">
                    {errosImportacao.map((erro, i) => (
                      <p key={i} className="text-xs text-red-700">{erro}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetImportacao} className="w-full">
                Nova Importacao
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Historico de Importacoes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Historico de Importacoes</h3>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoadingHistorico ? 'animate-spin' : ''}`} />}
              onClick={() => refetchHistorico()}
            >
              Atualizar
            </Button>
          </div>

          {isLoadingHistorico ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-2">Carregando historico...</p>
            </div>
          ) : historicoData?.data && historicoData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Arquivo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Tipo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Data
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Resultado
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicoData.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                        {item.arquivo_nome}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.importados}/{item.total_linhas} importados
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === "sucesso"
                              ? "success"
                              : item.status === "parcial"
                              ? "warning"
                              : "error"
                          }
                          size="sm"
                        >
                          {item.status === "sucesso"
                            ? "Sucesso"
                            : item.status === "parcial"
                            ? "Parcial"
                            : "Erro"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma importacao realizada"
              description="Faca sua primeira importacao usando o formulario acima"
              icon={<FileSpreadsheet className="w-12 h-12 text-slate-300" />}
            />
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
