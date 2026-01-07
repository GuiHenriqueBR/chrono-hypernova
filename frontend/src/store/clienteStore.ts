import { create } from "zustand";
import type { Cliente } from "../types";
import { api } from "../services/api";

interface ClienteState {
  clientes: Cliente[];
  clienteSelecionado: Cliente | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string;

  // Actions
  fetchClientes: () => Promise<void>;
  fetchClienteById: (id: string) => Promise<void>;
  createCliente: (cliente: Partial<Cliente>) => Promise<Cliente>;
  updateCliente: (id: string, updates: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  clearError: () => void;
}

export const useClienteStore = create<ClienteState>((set) => ({
  clientes: [],
  clienteSelecionado: null,
  isLoading: false,
  error: null,
  searchTerm: "",

  fetchClientes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ data: Cliente[] }>("/clientes");
      set({ clientes: response.data, isLoading: false });
    } catch {
      set({ error: "Erro ao carregar clientes", isLoading: false });
    }
  },

  fetchClienteById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Cliente>(`/clientes/${id}`);
      set({ clienteSelecionado: response, isLoading: false });
    } catch {
      set({ error: "Erro ao carregar cliente", isLoading: false });
    }
  },

  createCliente: async (cliente: Partial<Cliente>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<Cliente>("/clientes", cliente);
      const novoCliente = response;
      set((state) => ({
        clientes: [...state.clientes, novoCliente],
        isLoading: false,
      }));
      return novoCliente;
    } catch (error) {
      set({ error: "Erro ao criar cliente", isLoading: false });
      throw error;
    }
  },

  updateCliente: async (id: string, updates: Partial<Cliente>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<Cliente>(`/clientes/${id}`, updates);
      const clienteAtualizado = response;
      set((state) => ({
        clientes: state.clientes.map((c) =>
          c.id === id ? clienteAtualizado : c
        ),
        clienteSelecionado:
          state.clienteSelecionado?.id === id
            ? clienteAtualizado
            : state.clienteSelecionado,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "Erro ao atualizar cliente", isLoading: false });
      throw error;
    }
  },

  deleteCliente: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/clientes/${id}`);
      set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "Erro ao deletar cliente", isLoading: false });
      throw error;
    }
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Selector para busca filtrada
export const useFilteredClientes = () => {
  const { clientes, searchTerm } = useClienteStore();

  if (!searchTerm) return clientes;

  const term = searchTerm.toLowerCase();
  return clientes.filter(
    (cliente) =>
      cliente.nome.toLowerCase().includes(term) ||
      cliente.cpf_cnpj.includes(term) ||
      cliente.email?.toLowerCase().includes(term) ||
      cliente.telefone?.includes(term)
  );
};
