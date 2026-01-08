import { useState, useEffect } from "react";
import { User, Plus } from "lucide-react";
import { Card, Button, Input, Badge, Modal, ModalFooter } from "../common";
import { adminService, User as UserType } from "../../services/adminService";
import { toast } from "react-hot-toast";

export function UsuariosTab() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "", // Optional in backend if we autogenerate, but currently backend requires it
    role: "corretor" as "admin" | "corretor" | "assistente",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.nome || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setCreating(true);
      await adminService.createUser({
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      toast.success("Usuário criado com sucesso!");
      setIsModalOpen(false);
      setFormData({ nome: "", email: "", password: "", role: "corretor" });
      loadUsers();
    } catch (error: any) {
      console.error("Create user error", error);
      toast.error(error.response?.data?.message || "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-violet-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Gerenciamento de Usuários
            </h2>
            <p className="text-sm text-slate-500">
              Adicione e gerencie o acesso ao sistema
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo Usuário
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-4 text-sm font-semibold text-slate-600">
                Nome
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-600">
                Email
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-600">
                Cargo
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-600">
                Status
              </th>
              <th className="py-3 px-4 text-right text-sm font-semibold text-slate-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">
                    {user.nome}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === "admin" ? "warning" : "info"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.ativo ? "success" : "neutral"}>
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {/* Add edit/delete actions later */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Usuário"
      >
        <div className="space-y-4 p-4">
          <Input
            label="Nome Completo"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Ana Silva"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="email@empresa.com"
          />
          <Input
            label="Senha Temporária"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="******"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Permissão (Cargo)
            </label>
            <div className="flex gap-4">
              {(["admin", "corretor", "assistente"] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="role"
                    checked={formData.role === role}
                    onChange={() => setFormData({ ...formData, role })}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {role}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateUser} disabled={creating}>
            {creating ? "Criando..." : "Criar Usuário"}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}
