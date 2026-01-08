import { useState } from "react";
import { Search, Menu } from "lucide-react";
import { NotificationBell } from "../common/NotificationBell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header
      className="
      h-16 
      bg-white/80 backdrop-blur-xl
      border-b border-slate-200
      px-6
      flex items-center justify-between
      sticky top-0 z-30
      shadow-sm shadow-slate-200/50
    "
    >
      {/* Left - Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {/* Right - Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar clientes, apólices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-64 pl-10 pr-4 py-2
              bg-slate-100 border border-transparent
              rounded-xl
              text-sm text-slate-800 placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white focus:border-violet-200
              transition-all duration-200
            "
          />
        </div>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}
