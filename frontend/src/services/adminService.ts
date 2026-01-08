import { api } from "./api";

export interface User {
  id: string;
  email: string;
  nome: string;
  role: "admin" | "corretor" | "assistente";
  ativo: boolean;
  created_at: string;
}

export interface CreateUserDTO {
  email: string;
  nome: string;
  role: "admin" | "corretor" | "assistente";
  password?: string;
}

export const adminService = {
  getUsers: async () => {
    const data = await api.get<User[]>("/admin/users");
    return data;
  },

  createUser: async (userData: CreateUserDTO) => {
    const data = await api.post<User>("/admin/users", userData);
    return data;
  },
};
