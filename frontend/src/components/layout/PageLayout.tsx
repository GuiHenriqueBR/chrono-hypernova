import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageLayout({
  children,
  title,
  subtitle,
  actions,
}: PageLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Sidebar - Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:ml-70">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Actions Bar (when provided) */}
        {actions && (
          <div className="px-6 py-3 bg-white/60 backdrop-blur-sm border-b border-slate-100 flex justify-end gap-2 text-sm">
            {actions}
          </div>
        )}

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
