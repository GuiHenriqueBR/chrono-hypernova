import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import { Button, Card, Input, Modal, ModalFooter, Skeleton, EmptyState, Badge } from "../components/common";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente, useClientesStats } from "../hooks/useClientes";
import { Cliente } from "../types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Validar CPF
function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

// Validar CNPJ
function validarCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

// Formatar CPF/CNPJ
function formatarCPF_CNPJ(value: string, tipo: 'PF' | 'PJ'): string {
  const cleaned = value.replace(/\D/g, "");
  if (tipo === 'PF') {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return cleaned
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
}

// Formatar telefone
function formatarTelefone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return cleaned
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

interface FormData {
  tipo: 'PF' | 'PJ';
  cpf_cnpj: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  cidade: string;
  estado: string;
}

const initialFormData: FormData = {
  tipo: 'PF',
  cpf_cnpj: '',
  nome: '',
  email: '',
  telefone: '',
  data_nascimento: '',
  cidade: '',
  estado: '',
};

export default function Clientes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [filterTipo, setFilterTipo] = useState<'todos' | 'PF' | 'PJ'>('todos');

  // API hooks
  const { data, isLoading, error } = useClientes(debouncedSearch);
  const { data: stats } = useClientesStats();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  });

  // Filter clientes
  const clientesList = useMemo(() => data?.data || [], [data?.data]);
  const filteredClientes = useMemo(() => {
    if (!clientesList.length) return [];
    if (filterTipo === 'todos') return clientesList;
    return clientesList.filter((c: Cliente) => c.tipo === filterTipo);
  }, [clientesList, filterTipo]);

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf_cnpj') {
      formattedValue = formatarCPF_CNPJ(value, formData.tipo);
    } else if (field === 'telefone') {
      formattedValue = formatarTelefone(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Handle tipo change
  const handleTipoChange = (tipo: 'PF' | 'PJ') => {
    setFormData(prev => ({
      ...prev,
      tipo,
      cpf_cnpj: '', // Reset CPF/CNPJ when changing type
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.nome.trim()) {
      errors.nome = 'Nome e obrigatorio';
    }
    
    if (!formData.cpf_cnpj.trim()) {
      errors.cpf_cnpj = formData.tipo === 'PF' ? 'CPF e obrigatorio' : 'CNPJ e obrigatorio';
    } else {
      const isValid = formData.tipo === 'PF' 
        ? validarCPF(formData.cpf_cnpj) 
        : validarCNPJ(formData.cpf_cnpj);
      if (!isValid) {
        errors.cpf_cnpj = formData.tipo === 'PF' ? 'CPF invalido' : 'CNPJ invalido';
      }
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      await createCliente.mutateAsync({
        tipo: formData.tipo,
        cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ''),
        nome: formData.nome,
        email: formData.email || undefined,
        telefone: formData.telefone || undefined,
        data_nascimento: formData.data_nascimento || undefined,
        endereco: formData.cidade || formData.estado ? {
          rua: '',
          numero: '',
          bairro: '',
          cidade: formData.cidade,
          estado: formData.estado,
          cep: '',
        } : undefined,
      });
      
      setIsModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar cliente';
      setFormErrors({ cpf_cnpj: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!clienteToDelete) return;
    
    try {
      await deleteCliente.mutateAsync(clienteToDelete.id);
      setDeleteModalOpen(false);
      setClienteToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  // Handle open edit modal
  const handleOpenEditModal = (cliente: Cliente) => {
    setClienteToEdit(cliente);
    setFormData({
      tipo: cliente.tipo,
      cpf_cnpj: formatarCPF_CNPJ(cliente.cpf_cnpj, cliente.tipo),
      nome: cliente.nome,
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      data_nascimento: cliente.data_nascimento || '',
      cidade: cliente.endereco?.cidade || '',
      estado: cliente.endereco?.estado || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!validateForm() || !clienteToEdit) return;
    
    try {
      await updateCliente.mutateAsync({
        id: clienteToEdit.id,
        data: {
          tipo: formData.tipo,
          cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ''),
          nome: formData.nome,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined,
          data_nascimento: formData.data_nascimento || undefined,
          endereco: formData.cidade || formData.estado ? {
            rua: clienteToEdit.endereco?.rua || '',
            numero: clienteToEdit.endereco?.numero || '',
            bairro: clienteToEdit.endereco?.bairro || '',
            cidade: formData.cidade,
            estado: formData.estado,
            cep: clienteToEdit.endereco?.cep || '',
          } : undefined,
        },
      });
      
      setIsEditModalOpen(false);
      setClienteToEdit(null);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar cliente';
      setFormErrors({ cpf_cnpj: errorMessage });
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setClienteToEdit(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  // Format CPF/CNPJ for display
  const formatDisplayCPF_CNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return value;
  };

  return (
    <PageLayout
      title="Clientes"
      subtitle={`${stats?.total || data?.total || 0} clientes cadastrados`}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-slate-800">{stats?.total || 0}</p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ativos</p>
              <p className="text-lg font-bold text-slate-800">{stats?.ativos || 0}</p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pessoa Fisica</p>
              <p className="text-lg font-bold text-slate-800">{stats?.pf || 0}</p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100">
              <Building2 className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pessoa Juridica</p>
              <p className="text-lg font-bold text-slate-800">{stats?.pj || 0}</p>
            </div>
          </Card>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-4 justify-between"
        >
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Debounce
                  setTimeout(() => setDebouncedSearch(e.target.value), 300);
                }}
                className="
                  w-full pl-10 pr-4 py-2.5
                  bg-white border border-slate-200
                  rounded-xl
                  text-sm text-slate-800 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                  transition-all
                "
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['todos', 'PF', 'PJ'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFilterTipo(tipo)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${filterTipo === tipo 
                      ? 'bg-white text-violet-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  {tipo === 'todos' ? 'Todos' : tipo}
                </button>
              ))}
            </div>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Novo Cliente
          </Button>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="text-center py-12">
            <p className="text-red-500">Erro ao carregar clientes</p>
          </Card>
        )}

        {/* Clients Grid */}
        {!isLoading && !error && (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredClientes.map((cliente: Cliente) => (
              <motion.div key={cliente.id} variants={itemVariants}>
                <Card className="relative group hover:border-violet-200 transition-colors cursor-pointer"
                  onClick={() => navigate(`/clientes/${cliente.id}`)}
                >
                  {/* Actions */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clientes/${cliente.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(cliente);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setClienteToDelete(cliente);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${
                        cliente.tipo === "PF"
                          ? "bg-violet-100 text-violet-600"
                          : "bg-cyan-100 text-cyan-600"
                      }
                    `}
                    >
                      {cliente.tipo === "PF" ? (
                        <User className="w-6 h-6" />
                      ) : (
                        <Building2 className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">
                          {cliente.nome}
                        </h3>
                        {!cliente.ativo && (
                          <Badge variant="neutral" size="sm">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDisplayCPF_CNPJ(cliente.cpf_cnpj)}
                      </p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.telefone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{cliente.telefone}</span>
                      </div>
                    )}
                    {cliente.endereco && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>
                          {cliente.endereco.cidade}, {cliente.endereco.estado}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Desde {new Date(cliente.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <button className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors">
                      Ver detalhes
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredClientes.length === 0 && (
          <EmptyState
            icon={<User className="w-8 h-8" />}
            title="Nenhum cliente encontrado"
            description={searchTerm 
              ? "Tente ajustar os filtros ou termo de busca" 
              : "Comece adicionando seu primeiro cliente"
            }
            action={{
              label: "Novo Cliente",
              onClick: () => setIsModalOpen(true)
            }}
          />
        )}
      </motion.div>

      {/* Modal Novo Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Novo Cliente"
        size="lg"
      >
        <div className="space-y-4">
          {/* Tipo de Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Cliente
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleTipoChange("PF")}
                className={`
                  flex-1 p-3 rounded-xl border transition-all
                  ${
                    formData.tipo === "PF"
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Pessoa Fisica</span>
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("PJ")}
                className={`
                  flex-1 p-3 rounded-xl border transition-all
                  ${
                    formData.tipo === "PJ"
                      ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Pessoa Juridica</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={formData.tipo === "PF" ? "Nome Completo *" : "Razao Social *"}
              placeholder={
                formData.tipo === "PF" ? "Joao da Silva" : "Empresa ABC Ltda"
              }
              value={formData.nome}
              onChange={(e) => handleFormChange('nome', e.target.value)}
              error={formErrors.nome}
            />
            <Input
              label={formData.tipo === "PF" ? "CPF *" : "CNPJ *"}
              placeholder={
                formData.tipo === "PF" ? "000.000.000-00" : "00.000.000/0001-00"
              }
              value={formData.cpf_cnpj}
              onChange={(e) => handleFormChange('cpf_cnpj', e.target.value)}
              error={formErrors.cpf_cnpj}
              maxLength={formData.tipo === "PF" ? 14 : 18}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Email" 
              type="email" 
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              error={formErrors.email}
            />
            <Input 
              label="Telefone" 
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => handleFormChange('telefone', e.target.value)}
              maxLength={15}
            />
          </div>

          {formData.tipo === "PF" && (
            <Input 
              label="Data de Nascimento" 
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => handleFormChange('data_nascimento', e.target.value)}
            />
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input 
                label="Cidade" 
                placeholder="Sao Paulo"
                value={formData.cidade}
                onChange={(e) => handleFormChange('cidade', e.target.value)}
              />
            </div>
            <Input 
              label="Estado" 
              placeholder="SP"
              value={formData.estado}
              onChange={(e) => handleFormChange('estado', e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
        </div>

        <ModalFooter>
          <Button 
            variant="ghost" 
            onClick={() => {
              setIsModalOpen(false);
              setFormData(initialFormData);
              setFormErrors({});
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createCliente.isPending}
          >
            {createCliente.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Cliente'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setClienteToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir o cliente
          </p>
          <p className="font-semibold text-slate-800">
            {clienteToDelete?.nome}?
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Esta acao nao pode ser desfeita.
          </p>
        </div>

        <ModalFooter>
          <Button 
            variant="ghost" 
            onClick={() => {
              setDeleteModalOpen(false);
              setClienteToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger"
            onClick={handleDelete}
            disabled={deleteCliente.isPending}
          >
            {deleteCliente.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Cliente'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Editar Cliente"
        size="lg"
      >
        <div className="space-y-4">
          {/* Tipo de Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Cliente
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleTipoChange("PF")}
                className={`
                  flex-1 p-3 rounded-xl border transition-all
                  ${
                    formData.tipo === "PF"
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Pessoa Fisica</span>
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("PJ")}
                className={`
                  flex-1 p-3 rounded-xl border transition-all
                  ${
                    formData.tipo === "PJ"
                      ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Pessoa Juridica</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={formData.tipo === "PF" ? "Nome Completo *" : "Razao Social *"}
              placeholder={
                formData.tipo === "PF" ? "Joao da Silva" : "Empresa ABC Ltda"
              }
              value={formData.nome}
              onChange={(e) => handleFormChange('nome', e.target.value)}
              error={formErrors.nome}
            />
            <Input
              label={formData.tipo === "PF" ? "CPF *" : "CNPJ *"}
              placeholder={
                formData.tipo === "PF" ? "000.000.000-00" : "00.000.000/0001-00"
              }
              value={formData.cpf_cnpj}
              onChange={(e) => handleFormChange('cpf_cnpj', e.target.value)}
              error={formErrors.cpf_cnpj}
              maxLength={formData.tipo === "PF" ? 14 : 18}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Email" 
              type="email" 
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              error={formErrors.email}
            />
            <Input 
              label="Telefone" 
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => handleFormChange('telefone', e.target.value)}
              maxLength={15}
            />
          </div>

          {formData.tipo === "PF" && (
            <Input 
              label="Data de Nascimento" 
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => handleFormChange('data_nascimento', e.target.value)}
            />
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input 
                label="Cidade" 
                placeholder="Sao Paulo"
                value={formData.cidade}
                onChange={(e) => handleFormChange('cidade', e.target.value)}
              />
            </div>
            <Input 
              label="Estado" 
              placeholder="SP"
              value={formData.estado}
              onChange={(e) => handleFormChange('estado', e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
        </div>

        <ModalFooter>
          <Button 
            variant="ghost" 
            onClick={handleCloseEditModal}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={updateCliente.isPending}
          >
            {updateCliente.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Atualizar Cliente'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
