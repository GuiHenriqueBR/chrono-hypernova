import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  DollarSign,
  Calendar,
  LogOut,
  Settings,
  Shield,
  MessageSquare,
  Upload,
  Link2,
  Building2,
  Stethoscope,
  Wallet,
  FileSpreadsheet,
  Bell,
} from "lucide-react";
import { motion } from "framer-motion";
import { NotificationBell } from "../common";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Cotacoes", href: "/cotacoes", icon: FileSpreadsheet },
  { name: "Apolices", href: "/apolices", icon: FileText },
  { name: "Sinistros", href: "/sinistros", icon: AlertTriangle },
  { name: "Consorcios", href: "/consorcios", icon: Building2 },
  { name: "Planos de Saude", href: "/planos-saude", icon: Stethoscope },
  { name: "Financiamentos", href: "/financiamentos", icon: Wallet },
  { name: "WhatsApp CRM", href: "/crm", icon: MessageSquare },
  { name: "Conexão WhatsApp", href: "/whatsapp", icon: Link2 },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Alertas", href: "/alertas", icon: Bell },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Importacao", href: "/importar", icon: Upload },
  { name: "Configuracoes", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="
        glass-sidebar
        fixed left-0 top-0 bottom-0
        w-[280px]
        flex flex-col
        z-50
      "
    >
      {/* Logo */}
      <div className="h-20 px-6 flex items-center gap-3 border-b border-white/40">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-display">
            Corretora
          </h1>
          <p className="text-xs text-slate-500 font-medium">System Premium</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl
              text-sm font-medium transition-all duration-300
              ${
                isActive
                  ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-100 ring-1 ring-violet-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-violet-600" : "text-slate-400"
                  }`}
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/40">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/60 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold border border-violet-200">
            {user?.nome?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.nome || "Usuário"}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || "email@admin.com"}
            </p>
          </div>
          <NotificationBell />
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
