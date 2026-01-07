import type { ReactNode } from "react";
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
  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ml-[280px]">
        {/* Header */}
        <Header title={title} subtitle={subtitle} />

        {/* Actions Bar (when provided) */}
        {actions && (
          <div className="px-6 py-3 bg-white/60 backdrop-blur-sm border-b border-slate-100 flex justify-end gap-2">
            {actions}
          </div>
        )}

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
