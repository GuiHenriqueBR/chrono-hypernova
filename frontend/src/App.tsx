import { lazy, Suspense, type ReactNode, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { useRealtimeNotifications } from "./hooks/useRealtime";
import {
  ErrorBoundary,
  LoadingPage,
  ToastContainer,
} from "./components/common";

const preloadDashboard = () => import("./pages/Dashboard");
const Dashboard = lazy(preloadDashboard);
const Login = lazy(() => import("./pages/Login"));
const Clientes = lazy(() => import("./pages/Clientes"));
const ClienteDetalhes = lazy(() => import("./pages/ClienteDetalhes"));
const Apolices = lazy(() => import("./pages/Apolices"));
const ApoliceDetalhes = lazy(() => import("./pages/ApoliceDetalhes"));
const Sinistros = lazy(() => import("./pages/Sinistros"));
const SinistroDetalhes = lazy(() => import("./pages/SinistroDetalhes"));
const Cotacoes = lazy(() => import("./pages/Cotacoes"));
const CotacaoDetalhes = lazy(() => import("./pages/CotacaoDetalhes"));
const PropostaDetalhes = lazy(() => import("./pages/PropostaDetalhes"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Alertas = lazy(() => import("./pages/Alertas"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Importacao = lazy(() => import("./pages/Importacao"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Consorcios = lazy(() => import("./pages/Consorcios"));
const ConsorcioDetalhes = lazy(() => import("./pages/ConsorcioDetalhes"));
const PlanosSaude = lazy(() => import("./pages/PlanosSaude"));
const PlanoSaudeDetalhes = lazy(() => import("./pages/PlanoSaudeDetalhes"));
const Financiamentos = lazy(() => import("./pages/Financiamentos"));
const FinanciamentoDetalhes = lazy(
  () => import("./pages/FinanciamentoDetalhes")
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  // Ativar notificacoes em tempo real quando autenticado
  useRealtimeNotifications();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const warmup = () => {
      void preloadDashboard();
      void import("./pages/Clientes");
      void import("./pages/Cotacoes");
      void import("./pages/Apolices");
      void import("./pages/WhatsApp");
    };

    const timeoutId = window.setTimeout(warmup, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingPage />}>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes/:id"
                element={
                  <ProtectedRoute>
                    <ClienteDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cotacoes"
                element={
                  <ProtectedRoute>
                    <Cotacoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cotacoes/nova"
                element={
                  <ProtectedRoute>
                    <CotacaoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cotacoes/:id"
                element={
                  <ProtectedRoute>
                    <CotacaoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/propostas/:id"
                element={
                  <ProtectedRoute>
                    <PropostaDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apolices"
                element={
                  <ProtectedRoute>
                    <Apolices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apolices/:id"
                element={
                  <ProtectedRoute>
                    <ApoliceDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sinistros"
                element={
                  <ProtectedRoute>
                    <Sinistros />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sinistros/:id"
                element={
                  <ProtectedRoute>
                    <SinistroDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <ProtectedRoute>
                    <Financeiro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agenda"
                element={
                  <ProtectedRoute>
                    <Agenda />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alertas"
                element={
                  <ProtectedRoute>
                    <Alertas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar"
                element={
                  <ProtectedRoute>
                    <Importacao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/whatsapp"
                element={
                  <ProtectedRoute>
                    <WhatsApp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute>
                    <Configuracoes />
                  </ProtectedRoute>
                }
              />

              {/* Novos Modulos */}
              <Route
                path="/consorcios"
                element={
                  <ProtectedRoute>
                    <Consorcios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consorcios/:id"
                element={
                  <ProtectedRoute>
                    <ConsorcioDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planos-saude"
                element={
                  <ProtectedRoute>
                    <PlanosSaude />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planos-saude/:id"
                element={
                  <ProtectedRoute>
                    <PlanoSaudeDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financiamentos"
                element={
                  <ProtectedRoute>
                    <Financiamentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financiamentos/:id"
                element={
                  <ProtectedRoute>
                    <FinanciamentoDetalhes />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Toast Notifications */}
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
