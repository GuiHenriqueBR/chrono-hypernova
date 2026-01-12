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
  X,
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();

  return (
    <motion.aside
      initial={false}
      animate={{
        x: isOpen || window.innerWidth >= 1024 ? 0 : -280,
      }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={`
        glass-sidebar
        fixed left-0 top-0 bottom-0
        w-70
        flex flex-col
        z-50
        lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      {/* Logo & Close Button (Mobile) */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-white/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-800 font-display">
              Corretora
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              System Premium
            </p>
          </div>
        </div>

        {/* Close Button Mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={() => window.innerWidth < 1024 && onClose?.()}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl
              text-sm font-medium transition-all duration-300
              ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-100 ring-1 ring-primary-200"
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-white/50"
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-primary-600" : "text-neutral-400"
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
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
            {user?.nome?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-800 truncate">
              {user?.nome || "Usuário"}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {user?.email || "email@admin.com"}
            </p>
          </div>
          <NotificationBell />
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-danger-50 text-neutral-400 hover:text-danger-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
